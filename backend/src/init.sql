-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- ── Categories ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  parent_id  INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT categories_name_parent_unique UNIQUE (name, parent_id)
);

-- ── Pages ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pages (
  id          SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pages_category ON pages(category_id);
CREATE INDEX IF NOT EXISTS idx_pages_title    ON pages USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_pages_content  ON pages USING gin(to_tsvector('english', content));

-- ── Attachments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attachments (
  id            SERIAL PRIMARY KEY,
  page_id       INTEGER REFERENCES pages(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size          INTEGER NOT NULL,
  path          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_page ON attachments(page_id);

-- ── Auto-update updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pages_updated_at ON pages;
CREATE TRIGGER pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Grants ────────────────────────────────────────────────────────────────────
GRANT ALL PRIVILEGES ON TABLE categories  TO wiki;
GRANT ALL PRIVILEGES ON TABLE pages       TO wiki;
GRANT ALL PRIVILEGES ON TABLE attachments TO wiki;
GRANT USAGE, SELECT ON SEQUENCE categories_id_seq  TO wiki;
GRANT USAGE, SELECT ON SEQUENCE pages_id_seq       TO wiki;
GRANT USAGE, SELECT ON SEQUENCE attachments_id_seq TO wiki;

-- ── Seed data ─────────────────────────────────────────────────────────────────
INSERT INTO categories (name, parent_id, sort_order) VALUES
  ('Homelab',    NULL, 1),
  ('Networking', NULL, 2),
  ('Proxmox',    NULL, 3)
ON CONFLICT DO NOTHING;

INSERT INTO pages (category_id, title, content, sort_order) VALUES
  (1, 'Nginx – Add extra paths', E'# Nginx – Add extra paths\n\nUseful when reverse-proxying services that live on sub-paths.\n\n## PiHole admin page example\n\n```nginx\nlocation / {\n    proxy_pass http://192.168.1.155:80/admin/;\n    proxy_set_header Host $host;\n    proxy_set_header X-Real-IP $remote_addr;\n    proxy_hide_header X-Frame-Options;\n    proxy_set_header X-Frame-Options "SAMEORIGIN";\n    proxy_read_timeout 90;\n}\n```\n\n## Notes\n\n- Always set **proxy_read_timeout** for slow upstreams\n- Hide upstream frame headers to avoid clickjacking', 1),
  (1, 'Docker – Quick Reference', E'# Docker – Quick Reference\n\n## Containers\n\n```bash\ndocker ps -a\ndocker logs -f <name>\ndocker exec -it <name> bash\n```\n\n## Compose\n\n```bash\ndocker compose up -d\ndocker compose pull\ndocker compose down\n```', 2),
  (2, 'VLANs – Overview', E'# VLANs – Overview\n\n## VLAN IDs\n\n| ID | Name | Subnet |\n|---|---|---|\n| 10 | Trusted | 192.168.10.0/24 |\n| 20 | IoT | 192.168.20.0/24 |\n| 30 | Guests | 192.168.30.0/24 |', 1),
  (3, 'Initial Installation', E'# Proxmox – Initial Installation\n\n## Post-install checklist\n\n1. Remove enterprise repo\n2. Run `apt update && apt dist-upgrade`\n3. Configure backup storage\n4. Enable IOMMU for GPU passthrough', 1)
ON CONFLICT DO NOTHING;