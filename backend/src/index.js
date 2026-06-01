import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import multer from 'multer';
import JSZip from 'jszip';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = process.env.UPLOADS_DIR || '/uploads';
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3001;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

function getMime(ext) {
  const map = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

// ── Health ───────────────────────────────────────────────────────────────────
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

app.patch('/api/categories/:id/move', async (req, res) => {
  const { parent_id, sort_order } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE categories SET parent_id=$1, sort_order=$2 WHERE id=$3 RETURNING *',
      [parent_id ?? null, sort_order, req.params.id]
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
    'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM pages WHERE category_id=$1', [cat_id]
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
  await pool.query(`UPDATE pages SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`, params);
  const full = await pool.query(
    'SELECT p.*, c.name AS category FROM pages p JOIN categories c ON c.id=p.category_id WHERE p.id=$1', [id]
  );
  res.json(full.rows[0]);
});

app.delete('/api/pages/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT path FROM attachments WHERE page_id=$1', [req.params.id]);
  for (const r of rows) await fs.unlink(r.path).catch(() => {});
  await pool.query('DELETE FROM pages WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

app.patch('/api/pages/:id/move', async (req, res) => {
  const { category_id, sort_order } = req.body;
  try {
    await pool.query(
      'UPDATE pages SET category_id=$1, sort_order=$2 WHERE id=$3',
      [category_id, sort_order, req.params.id]
    );
    const full = await pool.query(
      'SELECT p.*, c.name AS category FROM pages p JOIN categories c ON c.id=p.category_id WHERE p.id=$1',
      [req.params.id]
    );
    res.json(full.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Attachments ───────────────────────────────────────────────────────────────

// All attachments — must come BEFORE /:pageId route
app.get('/api/attachments/all', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM attachments ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/attachments/:pageId', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM attachments WHERE page_id=$1 ORDER BY created_at',
    [req.params.pageId]
  );
  res.json(rows);
});

app.delete('/api/attachments/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT path FROM attachments WHERE id=$1', [req.params.id]);
  if (rows[0]) await fs.unlink(rows[0].path).catch(() => {});
  await pool.query('DELETE FROM attachments WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ── Import helpers ────────────────────────────────────────────────────────────
async function upsertCategory(name, parentId, client) {
  const existing = await client.query(
    'SELECT * FROM categories WHERE name=$1 AND parent_id IS NOT DISTINCT FROM $2',
    [name, parentId || null]
  );
  if (existing.rows.length) return existing.rows[0];
  const { rows: maxRows } = await client.query(
    'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM categories WHERE parent_id IS NOT DISTINCT FROM $1',
    [parentId || null]
  );
  const { rows } = await client.query(
    'INSERT INTO categories (name, parent_id, sort_order) VALUES ($1, $2, $3) RETURNING *',
    [name, parentId || null, maxRows[0].next]
  );
  return rows[0];
}

async function parseImportFiles(files) {
  const mdFiles = [];
  const assetFiles = [];
  for (const file of files) {
    if (file.originalname.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file.buffer);
      for (const [zipPath, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        const buf = await zipEntry.async('nodebuffer');
        const name = path.basename(zipPath);
        const ext = path.extname(name).toLowerCase();
        if (ext === '.md') {
          mdFiles.push({ path: zipPath, name: name.replace(/\.md$/, ''), content: buf.toString('utf8') });
        } else if (['.png','.jpg','.jpeg','.gif','.webp','.svg','.pdf'].includes(ext)) {
          assetFiles.push({ name, zipPath, buffer: buf });
        }
      }
    } else if (file.originalname.toLowerCase().endsWith('.md')) {
      mdFiles.push({
        path: file.originalname,
        name: file.originalname.replace(/\.md$/, ''),
        content: file.buffer.toString('utf8')
      });
    } else {
      const ext = path.extname(file.originalname).toLowerCase();
      if (['.png','.jpg','.jpeg','.gif','.webp','.svg','.pdf'].includes(ext)) {
        assetFiles.push({ name: file.originalname, zipPath: file.originalname, buffer: file.buffer });
      }
    }
  }
  return { mdFiles, assetFiles };
}

function inferCategory(filePath) {
  const parts = filePath.split('/').filter(Boolean);
  if (parts.length <= 1) return 'Imported';
  return parts.slice(0, -1).join(' / ');
}

// ── Import endpoints ──────────────────────────────────────────────────────────
app.post('/api/import/preview', upload.array('files'), async (req, res) => {
  try {
    const { mdFiles, assetFiles } = await parseImportFiles(req.files);
    res.json({
      pages: mdFiles.map(f => ({
        name: f.name,
        path: f.path,
        category: inferCategory(f.path),
        contentLength: f.content.length,
      })),
      assets: assetFiles.map(a => ({ name: a.name, size: a.buffer.length })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/import', upload.array('files'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { mdFiles, assetFiles } = await parseImportFiles(req.files);

    // Single shared "Imported" category cache across all files
    const catCache = {};

    async function getCategoryForPath(filePath) {
      const parts = filePath.split('/').filter(Boolean).slice(0, -1);
      if (!parts.length) {
        // All flat files share one "Imported" group
        if (!catCache['__imported__']) {
          const cat = await upsertCategory('Imported', null, client);
          catCache['__imported__'] = cat.id;
        }
        return catCache['__imported__'];
      }
      let parentId = null;
      let cacheKey = '';
      for (const part of parts) {
        cacheKey = cacheKey ? `${cacheKey}/${part}` : part;
        if (!catCache[cacheKey]) {
          const cat = await upsertCategory(part, parentId, client);
          catCache[cacheKey] = cat.id;
        }
        parentId = catCache[cacheKey];
      }
      return parentId;
    }

    // Save all assets to disk first
    const assetMap = {};
    for (const asset of assetFiles) {
      const ext = path.extname(asset.name);
      const filename = `${randomUUID()}${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      await fs.writeFile(filePath, asset.buffer);
      const entry = { url: `/uploads/${filename}`, filename, filePath, mime: getMime(ext), size: asset.buffer.length };
      assetMap[asset.name] = entry;
      if (asset.zipPath && path.basename(asset.zipPath) !== asset.name) {
        assetMap[path.basename(asset.zipPath)] = entry;
      }
    }

    const results = [];
    for (const f of mdFiles) {
      const catId = await getCategoryForPath(f.path);
      const { rows: maxRows } = await client.query(
        'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM pages WHERE category_id=$1', [catId]
      );

      // Rewrite Obsidian ![[links]]
      let content = f.content;
      content = content.replace(/!\[\[([^\]]+)\]\]/g, (_, name) => {
        const asset = assetMap[name] || assetMap[path.basename(name)];
        if (!asset) return `\`[missing: ${name}]\``;
        const ext = path.extname(name).toLowerCase();
        return ['.png','.jpg','.jpeg','.gif','.webp','.svg'].includes(ext)
          ? `![${name}](${asset.url})`
          : `[${name}](${asset.url})`;
      });

      const { rows } = await client.query(
        'INSERT INTO pages (title, content, category_id, sort_order) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING *',
        [f.name, content, catId, maxRows[0].next]
      );

      if (rows[0]) {
        // Record referenced attachments
        for (const asset of assetFiles) {
          if (!f.content.includes(asset.name) && !f.content.includes(path.basename(asset.zipPath || ''))) continue;
          const saved = assetMap[asset.name];
          if (!saved) continue;
          await client.query(
            'INSERT INTO attachments (page_id, filename, original_name, mime_type, size, path) VALUES ($1,$2,$3,$4,$5,$6)',
            [rows[0].id, saved.filename, asset.name, saved.mime, saved.size, saved.filePath]
          );
        }
        results.push({ id: rows[0].id, title: f.name });
      }
    }

    // Also record any standalone assets (not referenced by any md file) under no page
    for (const asset of assetFiles) {
      const isReferenced = mdFiles.some(f => f.content.includes(asset.name));
      if (!isReferenced) {
        const saved = assetMap[asset.name];
        if (!saved) continue;
        await client.query(
          'INSERT INTO attachments (page_id, filename, original_name, mime_type, size, path) VALUES ($1,$2,$3,$4,$5,$6)',
          [null, saved.filename, asset.name, saved.mime, saved.size, saved.filePath]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ imported: results.length, pages: results });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Import error:', e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.listen(port, () => console.log(`Wiki API listening on :${port}`));