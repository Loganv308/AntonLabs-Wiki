import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3001;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Categories ───────────────────────────────────────────────────────────────
app.get('/api/categories', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY sort_order, name');
  res.json(rows);
});

app.get('/api/categories/tree', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY sort_order, name');
  const map = {};
  rows.forEach(r => { map[r.id] = { ...r, children: [] }; });
  const roots = [];
  rows.forEach(r => {
    if (r.parent_id && map[r.parent_id]) map[r.parent_id].children.push(map[r.id]);
    else roots.push(map[r.id]);
  });
  res.json(roots);
});

app.post('/api/categories', async (req, res) => {
  const { name, parent_id } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  try {
    const { rows: maxRows } = await pool.query(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM categories WHERE parent_id IS NOT DISTINCT FROM $1',
      [parent_id || null]
    );
    const { rows } = await pool.query(
      `INSERT INTO categories (name, parent_id, sort_order) VALUES ($1, $2, $3)
       ON CONFLICT (name, parent_id) DO UPDATE SET name=EXCLUDED.name RETURNING *`,
      [name.trim(), parent_id || null, maxRows[0].next]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/categories/:id', async (req, res) => {
  await pool.query('DELETE FROM categories WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// Move/reorder a category
app.patch('/api/categories/:id/move', async (req, res) => {
  const { parent_id, sort_order } = req.body;
  const id = req.params.id;
  try {
    const { rows } = await pool.query(
      `UPDATE categories SET parent_id=$1, sort_order=$2 WHERE id=$3 RETURNING *`,
      [parent_id ?? null, sort_order, id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Pages ────────────────────────────────────────────────────────────────────
app.get('/api/pages', async (req, res) => {
  const { search } = req.query;
  let query = `
    SELECT p.id, p.title, p.content, p.created_at, p.updated_at, p.sort_order,
           c.id AS category_id, c.name AS category, c.parent_id AS category_parent_id
    FROM pages p JOIN categories c ON c.id = p.category_id
  `;
  const params = [];
  if (search?.trim()) {
    params.push(search.trim());
    query += ` WHERE to_tsvector('english', p.title || ' ' || p.content) @@ plainto_tsquery('english', $1)`;
  }
  query += ' ORDER BY c.sort_order, c.name, p.sort_order, p.title';
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

app.get('/api/pages/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, c.name AS category FROM pages p
     JOIN categories c ON c.id = p.category_id WHERE p.id = $1`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  res.json(rows[0]);
});

app.post('/api/pages', async (req, res) => {
  const { title, content, category, category_id } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title required' });
  let cat_id = category_id;
  if (!cat_id && category?.trim()) {
    const catRes = await pool.query(
      `INSERT INTO categories (name, parent_id) VALUES ($1, NULL)
       ON CONFLICT (name, parent_id) DO UPDATE SET name=EXCLUDED.name RETURNING *`,
      [category.trim()]
    );
    cat_id = catRes.rows[0].id;
  }
  if (!cat_id) return res.status(400).json({ error: 'category required' });
  const { rows: maxRows } = await pool.query(
    'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM pages WHERE category_id=$1',
    [cat_id]
  );
  const { rows } = await pool.query(
    'INSERT INTO pages (title, content, category_id, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
    [title.trim(), content || '', cat_id, maxRows[0].next]
  );
  const full = await pool.query(
    'SELECT p.*, c.name AS category FROM pages p JOIN categories c ON c.id=p.category_id WHERE p.id=$1',
    [rows[0].id]
  );
  res.status(201).json(full.rows[0]);
});

app.put('/api/pages/:id', async (req, res) => {
  const { title, content, category, category_id } = req.body;
  const id = req.params.id;
  let cat_id = category_id;
  if (!cat_id && category?.trim()) {
    const catRes = await pool.query(
      `INSERT INTO categories (name, parent_id) VALUES ($1, NULL)
       ON CONFLICT (name, parent_id) DO UPDATE SET name=EXCLUDED.name RETURNING *`,
      [category.trim()]
    );
    cat_id = catRes.rows[0].id;
  }
  const fields = []; const params = []; let i = 1;
  if (title?.trim())         { fields.push(`title=$${i++}`);       params.push(title.trim()); }
  if (content !== undefined) { fields.push(`content=$${i++}`);     params.push(content); }
  if (cat_id)                { fields.push(`category_id=$${i++}`); params.push(cat_id); }
  if (!fields.length) return res.status(400).json({ error: 'nothing to update' });
  params.push(id);
  const { rows } = await pool.query(
    `UPDATE pages SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`, params
  );
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  const full = await pool.query(
    'SELECT p.*, c.name AS category FROM pages p JOIN categories c ON c.id=p.category_id WHERE p.id=$1', [id]
  );
  res.json(full.rows[0]);
});

app.delete('/api/pages/:id', async (req, res) => {
  await pool.query('DELETE FROM pages WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// Move/reorder a page
app.patch('/api/pages/:id/move', async (req, res) => {
  const { category_id, sort_order } = req.body;
  const id = req.params.id;
  try {
    const { rows } = await pool.query(
      `UPDATE pages SET category_id=$1, sort_order=$2 WHERE id=$3 RETURNING *`,
      [category_id, sort_order, id]
    );
    const full = await pool.query(
      'SELECT p.*, c.name AS category FROM pages p JOIN categories c ON c.id=p.category_id WHERE p.id=$1', [id]
    );
    res.json(full.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(port, () => console.log(`Wiki API listening on :${port}`));