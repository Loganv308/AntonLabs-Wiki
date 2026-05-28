# Homelab Wiki

A self-hosted wiki that renders Obsidian-flavoured markdown, backed by PostgreSQL.

## Stack

| Layer    | Tech                          |
|----------|-------------------------------|
| Frontend | React + Vite                  |
| Backend  | Node.js / Express REST API    |
| Database | PostgreSQL 16                 |
| Proxy    | Nginx (routes `/` and `/api`) |

## Quick start (bundled postgres)

```bash
cp .env.example .env
# edit .env — set a real POSTGRES_PASSWORD
docker compose up -d --build
```

Open http://localhost in your browser.

---

## Using your existing PostgreSQL

1. Edit `.env` and set `DATABASE_URL` to your existing instance:

```
DATABASE_URL=postgres://user:password@192.168.1.x:5432/wiki
```

2. Remove (or comment out) the `postgres` service in `docker-compose.yml`.

3. Run the schema manually against your DB:

```bash
psql $DATABASE_URL -f backend/src/init.sql
```

4. Start the stack:

```bash
docker compose up -d --build
```

---

## API reference

| Method | Path              | Body                          | Description        |
|--------|-------------------|-------------------------------|--------------------|
| GET    | /api/pages        | —                             | List all pages     |
| GET    | /api/pages?search=q | —                           | Full-text search   |
| GET    | /api/pages/:id    | —                             | Single page        |
| POST   | /api/pages        | `{title, category, content}`  | Create page        |
| PUT    | /api/pages/:id    | `{title?, category?, content?}` | Update page      |
| DELETE | /api/pages/:id    | —                             | Delete page        |
| GET    | /api/categories   | —                             | List categories    |

---

## File structure

```
wiki/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js      ← Express API
│       └── init.sql      ← Schema + seed data
└── frontend/
    ├── Dockerfile
    ├── vite.config.js
    └── src/
        ├── App.jsx       ← Main UI
        ├── api.js        ← API client
        └── markdown.js   ← MD renderer

```
