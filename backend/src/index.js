import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3001;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors());
app.use(express.json());

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Categories ───────────────────────────────────────────────────────────────
app.get('/api/categories', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM categories ORDER BY name'
  );
  res.json(rows);
});

app.post('/api/categories', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING *',
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  await pool.query('DELETE FROM categories WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ── Pages ────────────────────────────────────────────────────────────────────
// All pages (with category name joined)
app.get('/api/pages', async (req, res) => {
  const { search } = req.query;
  let query = `
    SELECT p.id, p.title, p.content, p.created_at, p.updated_at,
           c.id AS category_id, c.name AS category
    FROM pages p
    JOIN categories c ON c.id = p.category_id
  `;
  const params = [];
  if (search?.trim()) {
    params.push(search.trim());
    query += ` WHERE to_tsvector('english', p.title || ' ' || p.content) @@ plainto_tsquery('english', $1)`;
  }
  query += ' ORDER BY c.name, p.title';
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

// Single page
app.get('/api/pages/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, c.name AS category FROM pages p
     JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  res.json(rows[0]);
});

// Create page
app.post('/api/pages', async (req, res) => {
  const { title, content, category } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title required' });
  if (!category?.trim()) return res.status(400).json({ error: 'category required' });

  // Upsert category
  const catRes = await pool.query(
    'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING *',
    [category.trim()]
  );
  const category_id = catRes.rows[0].id;

  const { rows } = await pool.query(
    'INSERT INTO pages (title, content, category_id) VALUES ($1, $2, $3) RETURNING *',
    [title.trim(), content || '', category_id]
  );
  res.status(201).json({ ...rows[0], category: category.trim(), category_id });
});

// Update page
app.put('/api/pages/:id', async (req, res) => {
  const { title, content, category } = req.body;
  const id = req.params.id;

  let category_id;
  if (category?.trim()) {
    const catRes = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING *',
      [category.trim()]
    );
    category_id = catRes.rows[0].id;
  }

  const fields = [];
  const params = [];
  let i = 1;
  if (title?.trim()) { fields.push(`title=$${i++}`); params.push(title.trim()); }
  if (content !== undefined) { fields.push(`content=$${i++}`); params.push(content); }
  if (category_id) { fields.push(`category_id=$${i++}`); params.push(category_id); }

  if (!fields.length) return res.status(400).json({ error: 'nothing to update' });
  params.push(id);

  const { rows } = await pool.query(
    `UPDATE pages SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`,
    params
  );
  if (!rows.length) return res.status(404).json({ error: 'not found' });

  const full = await pool.query(
    'SELECT p.*, c.name AS category FROM pages p JOIN categories c ON c.id=p.category_id WHERE p.id=$1',
    [id]
  );
  res.json(full.rows[0]);
});

// Delete page
app.delete('/api/pages/:id', async (req, res) => {
  await pool.query('DELETE FROM pages WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

app.listen(port, () => console.log(`Wiki API listening on :${port}`));
