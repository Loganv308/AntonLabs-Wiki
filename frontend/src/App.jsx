import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api.js';
import { mdToHtml } from './markdown.js';

const css = String.raw;

const styles = css`
  .app { display: flex; height: 100vh; overflow: hidden; }

  /* ── Sidebar ── */
  .sidebar {
    width: 230px; min-width: 230px;
    background: var(--bg2);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column; overflow: hidden;
  }
  .sidebar-header {
    padding: 14px 14px 10px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; font-weight: 600; color: var(--text2);
    letter-spacing: .06em;
  }
  .sidebar-header svg { opacity: .5; }
  .search-wrap { padding: 8px 10px 4px; position: relative; }
  .search-wrap input { width: 100%; padding-left: 26px; font-size: 11.5px; }
  .search-icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); opacity: .4; }
  .tree { flex: 1; overflow-y: auto; padding: 4px 0 8px; }
  .cat-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 12px 3px;
    font-size: 10px; font-weight: 600; color: var(--text3);
    letter-spacing: .1em; text-transform: uppercase;
    cursor: pointer; user-select: none;
  }
  .cat-row:hover { color: var(--text2); }
  .cat-arrow { transition: transform .15s; display: inline-block; }
  .cat-arrow.open { transform: rotate(90deg); }
  .cat-pages { overflow: hidden; transition: max-height .2s ease; }
  .page-row {
    display: flex; align-items: center; gap: 7px;
    padding: 5px 12px 5px 20px;
    font-size: 11.5px; color: var(--text2);
    cursor: pointer;
    border-left: 2px solid transparent;
    transition: all .1s;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .page-row:hover { background: var(--bg3); color: var(--text); }
  .page-row.active { color: var(--accent); border-left-color: var(--accent); background: var(--accent-dim); }
  .page-row svg { flex-shrink: 0; opacity: .5; }
  .new-btn {
    margin: 8px 10px;
    width: calc(100% - 20px);
    border: 1px dashed var(--border2) !important;
    justify-content: center;
    font-size: 11.5px;
  }

  /* ── Main ── */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar {
    padding: 10px 20px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    min-height: 44px;
  }
  .topbar-left { display: flex; align-items: center; gap: 6px; font-size: 12px; }
  .breadcrumb { color: var(--text3); }
  .sep { color: var(--text3); }
  .page-title { color: var(--text); font-weight: 600; }
  .topbar-right { display: flex; gap: 6px; align-items: center; }
  .status { font-size: 11px; color: var(--text3); margin-right: 4px; }
  .content { flex: 1; overflow-y: auto; padding: 28px 40px; }

  /* ── Viewer ── */
  .viewer h1 { font-size: 18px; font-weight: 600; color: var(--text); margin: 0 0 16px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
  .viewer h2 { font-size: 14px; font-weight: 600; color: var(--text); margin: 22px 0 10px; }
  .viewer h3 { font-size: 13px; font-weight: 600; color: var(--text2); margin: 18px 0 8px; }
  .viewer p  { color: var(--text2); margin: 0 0 10px; line-height: 1.75; }
  .viewer strong { color: var(--text); font-weight: 600; }
  .viewer a { color: var(--accent); }
  .viewer code.inline-code { background: var(--bg3); border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; font-size: 11.5px; color: #a8d8a8; }
  .viewer pre.code-block { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 14px 16px; margin: 0 0 14px; overflow-x: auto; position: relative; }
  .viewer pre.code-block::before { content: attr(data-lang); position: absolute; top: 8px; right: 12px; font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: .08em; }
  .viewer pre.code-block code { font-size: 12px; color: #8ec07c; line-height: 1.7; }
  .viewer ul, .viewer ol { padding-left: 20px; margin: 0 0 10px; color: var(--text2); }
  .viewer li { margin-bottom: 4px; line-height: 1.65; }
  .viewer blockquote { border-left: 3px solid var(--accent); padding: 8px 14px; margin: 0 0 12px; background: var(--accent-dim); border-radius: 0 var(--radius) var(--radius) 0; color: var(--text2); }
  .viewer table { width: 100%; border-collapse: collapse; margin: 0 0 14px; font-size: 12px; }
  .viewer th { background: var(--bg3); padding: 7px 12px; text-align: left; border: 1px solid var(--border); font-weight: 600; color: var(--text); }
  .viewer td { padding: 7px 12px; border: 1px solid var(--border); color: var(--text2); }
  .viewer hr { border: none; border-top: 1px solid var(--border); margin: 20px 0; }

  /* ── Editor ── */
  .editor { display: flex; flex-direction: column; gap: 10px; height: 100%; }
  .editor-meta { display: flex; gap: 8px; }
  .editor-meta input { font-size: 12px; }
  .editor-meta input:first-child { flex: 1; }
  .editor-meta input:last-child { flex: 2.5; }
  .editor textarea {
    flex: 1; min-height: 420px; resize: none; line-height: 1.75;
    font-size: 12.5px; font-family: var(--mono);
    tab-size: 2;
  }
  .editor-hint { font-size: 10.5px; color: var(--text3); }

  /* ── Empty ── */
  .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 10px; color: var(--text3); }
  .empty svg { opacity: .3; }
  .empty p { font-size: 12px; }

  /* ── Modal ── */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.6);
    display: flex; align-items: center; justify-content: center; z-index: 50;
  }
  .modal {
    background: var(--bg2); border: 1px solid var(--border2);
    border-radius: var(--radius-lg); padding: 20px 22px; width: 300px;
  }
  .modal h3 { font-size: 13px; font-weight: 600; margin-bottom: 14px; color: var(--text); }
  .modal input { width: 100%; margin-bottom: 8px; }
  .modal-btns { display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px; }

  .spin { animation: spin 1s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

function Icon({ d, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  book:   'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
  file:   'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
  search: 'M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z',
  edit:   'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  save:   'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h8',
  trash:  'M3 6h18 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M10 11v6 M14 11v6 M9 6V4h6v2',
  plus:   'M12 5v14 M5 12h14',
  x:      'M18 6 6 18 M6 6l12 12',
  chevron:'M9 18l6-6-6-6',
  loader: 'M12 2v4 M12 18v4 M4.93 4.93l2.83 2.83 M16.24 16.24l2.83 2.83 M2 12h4 M18 12h4 M4.93 19.07l2.83-2.83 M16.24 7.76l2.83-2.83',
};

export default function App() {
  const [pages, setPages] = useState([]);
  const [current, setCurrent] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ category: '', title: '', content: '' });
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [modal, setModal] = useState(false);
  const [newPage, setNewPage] = useState({ category: '', title: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const searchTimer = useRef(null);

  const loadPages = useCallback(async (q = '') => {
    try {
      const data = q ? await api.search(q) : await api.pages();
      setPages(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPages(); }, [loadPages]);

  const onSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadPages(val), 300);
  };

  const grouped = pages.reduce((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});
  const cats = Object.keys(grouped).sort();
  const allCats = [...new Set(pages.map(p => p.category))].sort();

  function selectPage(p) {
    setCurrent(p); setEditing(false); setStatus('');
  }

  function startEdit() {
    if (!current) return;
    setEditData({ category: current.category, title: current.title, content: current.content });
    setEditing(true);
  }

  function cancelEdit() { setEditing(false); }

  async function savePage() {
    setSaving(true);
    try {
      const updated = await api.updatePage(current.id, editData);
      setPages(prev => prev.map(p => p.id === updated.id ? updated : p));
      setCurrent(updated);
      setEditing(false);
      setStatus('Saved');
      setTimeout(() => setStatus(''), 2000);
    } catch (e) {
      setStatus('Error saving');
    } finally { setSaving(false); }
  }

  async function deletePage() {
    if (!current || !confirm(`Delete "${current.title}"?`)) return;
    await api.deletePage(current.id);
    setPages(prev => prev.filter(p => p.id !== current.id));
    setCurrent(null);
  }

  async function createPage() {
    if (!newPage.title.trim()) return;
    const cat = newPage.category.trim() || 'General';
    const created = await api.createPage({
      title: newPage.title.trim(),
      category: cat,
      content: `# ${newPage.title.trim()}\n\nStart writing here…`,
    });
    await loadPages(search);
    setModal(false);
    setNewPage({ category: '', title: '' });
    selectPage(created);
    setTimeout(() => startEdit(), 50);
  }

  const toggleCat = (cat) => setCollapsed(c => ({ ...c, [cat]: !c[cat] }));

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* ── Sidebar ── */}
        <div className="sidebar">
          <div className="sidebar-header">
            <Icon d={ICONS.book} size={16} />
            MY WIKI
          </div>
          <div className="search-wrap">
            <Icon d={ICONS.search} size={13} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', opacity: .4 }} />
            <span className="search-icon"><Icon d={ICONS.search} size={13} /></span>
            <input
              value={search}
              onChange={e => onSearch(e.target.value)}
              placeholder="Search…"
              style={{ paddingLeft: 28 }}
            />
          </div>
          <div className="tree">
            {loading && <div style={{ padding: '16px', color: 'var(--text3)', fontSize: 11 }}>Loading…</div>}
            {cats.map(cat => (
              <div key={cat}>
                <div className="cat-row" onClick={() => toggleCat(cat)}>
                  <span>{cat}</span>
                  <span className={`cat-arrow ${!collapsed[cat] ? 'open' : ''}`}>
                    <Icon d={ICONS.chevron} size={11} />
                  </span>
                </div>
                <div className="cat-pages" style={{ maxHeight: collapsed[cat] ? 0 : 600 }}>
                  {grouped[cat].map(p => (
                    <div
                      key={p.id}
                      className={`page-row${current?.id === p.id ? ' active' : ''}`}
                      onClick={() => selectPage(p)}
                      title={p.title}
                    >
                      <Icon d={ICONS.file} size={12} />
                      {p.title}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button className="new-btn" onClick={() => setModal(true)}>
            <Icon d={ICONS.plus} size={13} /> New page
          </button>
        </div>

        {/* ── Main ── */}
        <div className="main">
          <div className="topbar">
            <div className="topbar-left">
              {current ? <>
                <span className="breadcrumb">{current.category}</span>
                <span className="sep">/</span>
                <span className="page-title">{current.title}</span>
              </> : <span className="breadcrumb">Select a page</span>}
            </div>
            <div className="topbar-right">
              {status && <span className="status">{status}</span>}
              {current && !editing && (
                <>
                  <button className="danger" onClick={deletePage}><Icon d={ICONS.trash} size={12} /> Delete</button>
                  <button className="primary" onClick={startEdit}><Icon d={ICONS.edit} size={12} /> Edit</button>
                </>
              )}
              {editing && (
                <>
                  <button onClick={cancelEdit}><Icon d={ICONS.x} size={12} /> Cancel</button>
                  <button className="primary" onClick={savePage} disabled={saving}>
                    {saving
                      ? <><span className="spin"><Icon d={ICONS.loader} size={12} /></span> Saving…</>
                      : <><Icon d={ICONS.save} size={12} /> Save</>}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="content">
            {!current && (
              <div className="empty">
                <Icon d={ICONS.book} size={36} />
                <p>Select a page or create a new one</p>
              </div>
            )}
            {current && !editing && (
              <div
                className="viewer"
                dangerouslySetInnerHTML={{ __html: mdToHtml(current.content) }}
              />
            )}
            {current && editing && (
              <div className="editor">
                <div className="editor-meta">
                  <input
                    list="cat-opts"
                    value={editData.category}
                    onChange={e => setEditData(d => ({ ...d, category: e.target.value }))}
                    placeholder="Category"
                  />
                  <datalist id="cat-opts">{allCats.map(c => <option key={c} value={c} />)}</datalist>
                  <input
                    value={editData.title}
                    onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                    placeholder="Page title"
                  />
                </div>
                <textarea
                  value={editData.content}
                  onChange={e => setEditData(d => ({ ...d, content: e.target.value }))}
                  placeholder="Paste your Obsidian markdown here…"
                />
                <span className="editor-hint">Supports Markdown: headings, code blocks, tables, lists, bold, italic</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── New page modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <h3>New page</h3>
            <input
              list="cat-opts2"
              value={newPage.category}
              onChange={e => setNewPage(d => ({ ...d, category: e.target.value }))}
              placeholder="Category (e.g. Homelab)"
              autoFocus
            />
            <datalist id="cat-opts2">{allCats.map(c => <option key={c} value={c} />)}</datalist>
            <input
              value={newPage.title}
              onChange={e => setNewPage(d => ({ ...d, title: e.target.value }))}
              placeholder="Page title"
              onKeyDown={e => e.key === 'Enter' && createPage()}
            />
            <div className="modal-btns">
              <button onClick={() => setModal(false)}>Cancel</button>
              <button className="primary" onClick={createPage}>Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
