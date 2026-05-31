import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api.js';
import { mdToHtml } from './markdown.js';
import Import from './Import.jsx';

const css = String.raw;

const styles = css`
  .app { display: flex; height: 100vh; overflow: hidden; }

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
  .sidebar-header-right { margin-left: auto; display: flex; align-items: center; gap: 4px; }
  .sort-btn {
    background: none; border: none; padding: 2px 4px; cursor: pointer;
    color: var(--text3); font-size: 10px; border-radius: 3px;
    display: flex; align-items: center; gap: 3px;
  }
  .sort-btn:hover { background: var(--bg3); color: var(--text2); }
  .sort-btn.active { color: var(--accent); }
  .sort-menu {
    position: absolute; top: 100%; right: 0; z-index: 20;
    background: var(--bg2); border: 1px solid var(--border2);
    border-radius: 6px; padding: 4px; min-width: 140px;
    box-shadow: 0 4px 12px rgba(0,0,0,.3);
  }
  .sort-option {
    padding: 6px 10px; font-size: 11px; cursor: pointer;
    border-radius: 4px; color: var(--text2); display: flex; align-items: center; gap: 6px;
  }
  .sort-option:hover { background: var(--bg3); color: var(--text); }
  .sort-option.active { color: var(--accent); }

  .search-wrap { padding: 8px 10px 4px; position: relative; }
  .search-wrap input { width: 100%; padding-left: 26px; font-size: 11.5px; }
  .search-icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); opacity: .4; pointer-events: none; }
  .tree { flex: 1; overflow-y: auto; padding: 4px 0 8px; }

  .cat-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 12px 3px;
    font-size: 10px; font-weight: 600; color: var(--text3);
    letter-spacing: .1em; text-transform: uppercase;
    cursor: pointer; user-select: none;
  }
  .cat-row:hover { color: var(--text2); }
  .cat-row.drag-over { background: var(--accent-dim); border-radius: 4px; }
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
  .page-row.dragging { opacity: .4; }
  .page-row.drag-over { border-top: 2px solid var(--accent); }
  .page-row svg { flex-shrink: 0; opacity: .5; }
  .drag-handle { opacity: 0; cursor: grab; flex-shrink: 0; }
  .page-row:hover .drag-handle,
  .cat-row:hover .drag-handle { opacity: .35; }

  .drop-zone {
    height: 3px; margin: 0 12px; border-radius: 2px;
    background: transparent; transition: background .1s;
  }
  .drop-zone.active { background: var(--accent); }

  /* ── Attachments sidebar section ── */
  .attach-section { border-top: 1px solid var(--border); flex-shrink: 0; }
  .attach-section-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 12px 3px;
    font-size: 10px; font-weight: 600; color: var(--text3);
    letter-spacing: .1em; text-transform: uppercase;
    cursor: pointer; user-select: none;
  }
  .attach-section-header:hover { color: var(--text2); }
  .attach-list { overflow: hidden; max-height: 200px; overflow-y: auto; }
  .attach-row {
    display: flex; align-items: center; gap: 7px;
    padding: 5px 12px 5px 20px;
    font-size: 11px; color: var(--text2);
    cursor: pointer;
    border-left: 2px solid transparent;
    transition: all .1s;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .attach-row:hover { background: var(--bg3); color: var(--text); }
  .attach-row.active { color: var(--accent); border-left-color: var(--accent); background: var(--accent-dim); }
  .attach-row svg { flex-shrink: 0; opacity: .5; }
  .attach-badge {
    font-size: 9px; padding: 1px 4px; border-radius: 3px; flex-shrink: 0;
    background: var(--bg3); color: var(--text3);
  }
  .attach-badge.img { background: #1a3a2a; color: #4ade80; }
  .attach-badge.pdf { background: #3a1a1a; color: #f87171; }

  /* ── Preview modal ── */
  .preview-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.75);
    display: flex; align-items: center; justify-content: center;
    z-index: 100; padding: 24px;
  }
  .preview-modal {
    background: var(--bg2); border: 1px solid var(--border2);
    border-radius: var(--radius-lg); overflow: hidden;
    display: flex; flex-direction: column;
    max-width: 90vw; max-height: 90vh; min-width: 320px;
  }
  .preview-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-bottom: 1px solid var(--border);
    font-size: 12px; font-weight: 600; color: var(--text);
  }
  .preview-modal-header span { color: var(--text3); font-weight: 400; font-size: 11px; margin-left: 8px; }
  .preview-modal-body { flex: 1; overflow: auto; display: flex; align-items: center; justify-content: center; padding: 16px; }
  .preview-modal-body img { max-width: 100%; max-height: 70vh; border-radius: 6px; object-fit: contain; }
  .preview-modal-body iframe { width: 75vw; height: 75vh; border: none; border-radius: 6px; }
  .preview-close {
    background: none; border: none; cursor: pointer; padding: 4px;
    color: var(--text3); border-radius: 4px; display: flex; align-items: center;
  }
  .preview-close:hover { background: var(--bg3); color: var(--text); }

  .sidebar-btns {
    display: flex; gap: 6px; padding: 8px 10px;
    border-top: 1px solid var(--border);
  }
  .new-btn {
    flex: 1; border: 1px dashed var(--border2) !important;
    justify-content: center; font-size: 11px;
  }

  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar {
    padding: 10px 20px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between; min-height: 44px;
  }
  .topbar-left { display: flex; align-items: center; gap: 6px; font-size: 12px; }
  .breadcrumb { color: var(--text3); }
  .sep { color: var(--text3); }
  .page-title { color: var(--text); font-weight: 600; }
  .topbar-right { display: flex; gap: 6px; align-items: center; }
  .status { font-size: 11px; color: var(--text3); margin-right: 4px; }
  .content { flex: 1; overflow-y: auto; padding: 28px 40px; }

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

  .editor { display: flex; flex-direction: column; gap: 10px; height: 100%; }
  .editor-meta { display: flex; gap: 8px; }
  .editor-meta input { font-size: 12px; }
  .editor-meta select { flex: 1; font-size: 12px; background: var(--bg3); color: var(--text2); border: 1px solid var(--border); border-radius: var(--radius); padding: 6px 8px; }
  .editor-meta input:last-child { flex: 2.5; }
  .editor textarea { flex: 1; min-height: 420px; resize: none; line-height: 1.75; font-size: 12.5px; font-family: var(--mono); tab-size: 2; }
  .editor-hint { font-size: 10.5px; color: var(--text3); }

  .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 10px; color: var(--text3); }
  .empty svg { opacity: .3; }
  .empty p { font-size: 12px; }

  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 50; }
  .modal { background: var(--bg2); border: 1px solid var(--border2); border-radius: var(--radius-lg); padding: 20px 22px; width: 300px; }
  .modal h3 { font-size: 13px; font-weight: 600; margin-bottom: 14px; color: var(--text); }
  .modal input, .modal select { width: 100%; margin-bottom: 8px; font-size: 12px; }
  .modal select { background: var(--bg3); color: var(--text2); border: 1px solid var(--border); border-radius: var(--radius); padding: 6px 8px; }
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
  book:    'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
  file:    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
  folder:  'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
  search:  'M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z',
  edit:    'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  save:    'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h8',
  trash:   'M3 6h18 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M10 11v6 M14 11v6 M9 6V4h6v2',
  plus:    'M12 5v14 M5 12h14',
  x:       'M18 6 6 18 M6 6l12 12',
  chevron: 'M9 18l6-6-6-6',
  loader:  'M12 2v4 M12 18v4 M4.93 4.93l2.83 2.83 M16.24 16.24l2.83 2.83 M2 12h4 M18 12h4 M4.93 19.07l2.83-2.83 M16.24 7.76l2.83-2.83',
  grip:    'M9 5h.01 M9 12h.01 M9 19h.01 M15 5h.01 M15 12h.01 M15 19h.01',
  sort:    'M3 6h18 M7 12h10 M11 18h4',
  az:      'M3 17l4-8 4 8 M5.5 13h3 M17 17V7 M14 10l3-3 3 3',
  za:      'M3 7l4 8-4 8 M5.5 11h3 M17 7v10 M14 14l3 3 3-3',
  manual:  'M12 3v18 M8 7l4-4 4 4 M8 17l4 4 4-4',
  recent:  'M12 8v4l3 3 M3.05 11a9 9 0 1 0 .5-3',
  image:   'M21 15l-5-5L5 21 M3 3h18v18H3z M8.5 8.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2',
  pdf:     'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 13h6 M9 17h3',
  paperclip: 'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48',
};

const SORT_MODES = [
  { key: 'manual',     label: 'Manual',           icon: ICONS.manual },
  { key: 'alpha-asc',  label: 'A → Z',            icon: ICONS.az },
  { key: 'alpha-desc', label: 'Z → A',            icon: ICONS.za },
  { key: 'recent',     label: 'Recently updated', icon: ICONS.recent },
];

function flattenTree(nodes, depth = 0, result = []) {
  nodes.forEach(n => {
    result.push({ id: n.id, name: n.name, depth });
    if (n.children?.length) flattenTree(n.children, depth + 1, result);
  });
  return result;
}

function sortPages(pages, mode) {
  if (mode === 'alpha-asc')  return [...pages].sort((a, b) => a.title.localeCompare(b.title));
  if (mode === 'alpha-desc') return [...pages].sort((a, b) => b.title.localeCompare(a.title));
  if (mode === 'recent')     return [...pages].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  return [...pages].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function sortGroups(groups, mode) {
  if (mode === 'alpha-asc')  return [...groups].sort((a, b) => a.name.localeCompare(b.name));
  if (mode === 'alpha-desc') return [...groups].sort((a, b) => b.name.localeCompare(a.name));
  return [...groups].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function attachBadgeType(mimeType) {
  if (mimeType.startsWith('image/')) return 'img';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'other';
}

// ── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({ attachment, onClose }) {
  const isImage = attachment.mime_type.startsWith('image/');
  const isPdf   = attachment.mime_type === 'application/pdf';
  const url     = `/uploads/${attachment.filename}`;

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="preview-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="preview-modal">
        <div className="preview-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon d={isImage ? ICONS.image : ICONS.pdf} size={14} />
            {attachment.original_name}
            <span>{isImage ? 'Image' : 'PDF'}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <a href={url} target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>
              Open
            </a>
            <button className="preview-close" onClick={onClose}>
              <Icon d={ICONS.x} size={14} />
            </button>
          </div>
        </div>
        <div className="preview-modal-body">
          {isImage && <img src={url} alt={attachment.original_name} />}
          {isPdf   && <iframe src={url} title={attachment.original_name} />}
          {!isImage && !isPdf && (
            <p style={{ color: 'var(--text3)', fontSize: 12 }}>Preview not available. <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Download file</a></p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sidebar Attachments Section ───────────────────────────────────────────────
function SidebarAttachments({ onPreview }) {
  const [attachments, setAttachments] = useState([]);
  const [open, setOpen] = useState(true);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    api.allAttachments().then(setAttachments).catch(() => {});
  }, []);

  if (!attachments.length) return null;

  return (
    <div className="attach-section">
      <div className="attach-section-header" onClick={() => setOpen(o => !o)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon d={ICONS.paperclip} size={11} />
          Files
          <span style={{ fontSize: 9, background: 'var(--bg3)', borderRadius: 3, padding: '1px 4px', color: 'var(--text3)' }}>
            {attachments.length}
          </span>
        </span>
        <span className={`cat-arrow ${open ? 'open' : ''}`}>
          <Icon d={ICONS.chevron} size={11} />
        </span>
      </div>
      {open && (
        <div className="attach-list">
          {attachments.map(a => {
            const type = attachBadgeType(a.mime_type);
            return (
              <div
                key={a.id}
                className={`attach-row${activeId === a.id ? ' active' : ''}`}
                onClick={() => { setActiveId(a.id); onPreview(a); }}
                title={a.original_name}
              >
                <Icon d={type === 'img' ? ICONS.image : ICONS.pdf} size={12} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.original_name}
                </span>
                <span className={`attach-badge ${type}`}>{type}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TreeNode ─────────────────────────────────────────────────────────────────
function TreeNode({ node, pages, current, collapsed, onToggle, onSelect, depth,
                    sortMode, onDrop, dragState, setDragState }) {
  const nodePages = sortPages(pages.filter(p => p.category_id === node.id), sortMode);
  const sortedChildren = sortGroups(node.children || [], sortMode);
  const isOpen = !collapsed[node.id];
  const indent = depth * 10;
  const isDraggingOver = dragState.overGroup === node.id;

  function onGroupDragStart(e) {
    e.stopPropagation();
    setDragState({ type: 'group', id: node.id, parentId: node.parent_id });
    e.dataTransfer.effectAllowed = 'move';
  }
  function onGroupDragOver(e) {
    e.preventDefault(); e.stopPropagation();
    if (dragState.id !== node.id) setDragState(s => ({ ...s, overGroup: node.id }));
  }
  function onGroupDrop(e) {
    e.preventDefault(); e.stopPropagation();
    if (dragState.type === 'page') onDrop({ type: 'page-to-group', pageId: dragState.id, groupId: node.id });
    else if (dragState.type === 'group' && dragState.id !== node.id) onDrop({ type: 'group-into-group', groupId: dragState.id, parentId: node.id });
    setDragState({});
  }
  function onGroupDragLeave() { setDragState(s => ({ ...s, overGroup: null })); }

  return (
    <div>
      <div
        className={`cat-row${isDraggingOver ? ' drag-over' : ''}`}
        style={{ paddingLeft: 12 + indent }}
        draggable={sortMode === 'manual'}
        onDragStart={onGroupDragStart}
        onDragOver={onGroupDragOver}
        onDragLeave={onGroupDragLeave}
        onDrop={onGroupDrop}
        onClick={() => onToggle(node.id)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {sortMode === 'manual' && (
            <span className="drag-handle" onClick={e => e.stopPropagation()}>
              <Icon d={ICONS.grip} size={11} />
            </span>
          )}
          <Icon d={ICONS.folder} size={11} />
          {node.name}
        </span>
        <span className={`cat-arrow ${isOpen ? 'open' : ''}`}>
          <Icon d={ICONS.chevron} size={11} />
        </span>
      </div>

      <div className="cat-pages" style={{ maxHeight: isOpen ? 9999 : 0 }}>
        {sortedChildren.map((child, idx) => (
          <React.Fragment key={child.id}>
            <DropZone
              show={sortMode === 'manual'}
              active={dragState.overZone === `group-${node.id}-${idx}`}
              onDragOver={() => setDragState(s => ({ ...s, overZone: `group-${node.id}-${idx}` }))}
              onDragLeave={() => setDragState(s => ({ ...s, overZone: null }))}
              onDrop={() => { if (dragState.type === 'group') onDrop({ type: 'group-reorder', groupId: dragState.id, parentId: node.id, beforeId: child.id }); setDragState({}); }}
            />
            <TreeNode
              node={child} pages={pages} current={current} collapsed={collapsed}
              onToggle={onToggle} onSelect={onSelect} depth={depth + 1}
              sortMode={sortMode} onDrop={onDrop} dragState={dragState} setDragState={setDragState}
            />
          </React.Fragment>
        ))}

        {nodePages.map((p, idx) => (
          <React.Fragment key={p.id}>
            <DropZone
              show={sortMode === 'manual'}
              active={dragState.overZone === `page-${node.id}-${idx}`}
              onDragOver={() => setDragState(s => ({ ...s, overZone: `page-${node.id}-${idx}` }))}
              onDragLeave={() => setDragState(s => ({ ...s, overZone: null }))}
              onDrop={() => {
                if (dragState.type === 'page') onDrop({ type: 'page-reorder', pageId: dragState.id, groupId: node.id, beforeId: p.id });
                else if (dragState.type === 'group') onDrop({ type: 'group-reorder', groupId: dragState.id, parentId: node.id, beforeId: null });
                setDragState({});
              }}
            />
            <div
              className={`page-row${current?.id === p.id ? ' active' : ''}${dragState.type === 'page' && dragState.id === p.id ? ' dragging' : ''}`}
              style={{ paddingLeft: 20 + indent }}
              draggable={sortMode === 'manual'}
              onDragStart={e => { setDragState({ type: 'page', id: p.id, groupId: node.id }); e.dataTransfer.effectAllowed = 'move'; }}
              onDragEnd={() => setDragState({})}
              onClick={() => onSelect(p)}
              title={p.title}
            >
              {sortMode === 'manual' && <span className="drag-handle"><Icon d={ICONS.grip} size={11} /></span>}
              <Icon d={ICONS.file} size={12} />
              {p.title}
            </div>
          </React.Fragment>
        ))}

        <DropZone
          show={sortMode === 'manual'}
          active={dragState.overZone === `end-${node.id}`}
          onDragOver={() => setDragState(s => ({ ...s, overZone: `end-${node.id}` }))}
          onDragLeave={() => setDragState(s => ({ ...s, overZone: null }))}
          onDrop={() => {
            if (dragState.type === 'page') onDrop({ type: 'page-reorder', pageId: dragState.id, groupId: node.id, beforeId: null });
            else if (dragState.type === 'group') onDrop({ type: 'group-reorder', groupId: dragState.id, parentId: node.id, beforeId: null });
            setDragState({});
          }}
        />

        {!sortedChildren.length && !nodePages.length && (
          <div style={{ paddingLeft: 28 + indent, fontSize: 11, color: 'var(--text3)', padding: `4px 12px 4px ${28 + indent}px` }}>Empty</div>
        )}
      </div>
    </div>
  );
}

function DropZone({ show, active, onDragOver, onDragLeave, onDrop }) {
  if (!show) return null;
  return (
    <div
      className={`drop-zone${active ? ' active' : ''}`}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={e => { e.preventDefault(); onDrop(); }}
    />
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [showImport, setShowImport] = useState(false);
  const [pages, setPages] = useState([]);
  const [tree, setTree] = useState([]);
  const [current, setCurrent] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ category: '', category_id: null, title: '', content: '' });
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [pageModal, setPageModal] = useState(false);
  const [groupModal, setGroupModal] = useState(false);
  const [newPage, setNewPage] = useState({ category_id: '', title: '' });
  const [newGroup, setNewGroup] = useState({ name: '', parent_id: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [sortMode, setSortMode] = useState('manual');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [dragState, setDragState] = useState({});
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const searchTimer = useRef(null);
  const sortMenuRef = useRef(null);

  const loadAll = useCallback(async (q = '') => {
    try {
      const [pagesData, treeData] = await Promise.all([
        q ? api.search(q) : api.pages(),
        api.categoryTree(),
      ]);
      setPages(pagesData);
      setTree(treeData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    function handler(e) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) setShowSortMenu(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const onSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadAll(val), 300);
  };

  const flatCats = flattenTree(tree);
  const sortedTopLevel = sortGroups(tree, sortMode);

  async function handleDrop(action) {
    if (action.type === 'page-to-group') {
      const groupPages = pages.filter(p => p.category_id === action.groupId);
      const maxOrder = groupPages.reduce((m, p) => Math.max(m, p.sort_order ?? 0), 0);
      await api.movePage(action.pageId, action.groupId, maxOrder + 1);
    } else if (action.type === 'page-reorder') {
      const groupPages = sortPages(pages.filter(p => p.category_id === action.groupId), 'manual');
      const withoutDragged = groupPages.filter(p => p.id !== action.pageId);
      const insertIdx = action.beforeId ? withoutDragged.findIndex(p => p.id === action.beforeId) : withoutDragged.length;
      const reordered = [...withoutDragged.slice(0, insertIdx), { id: action.pageId }, ...withoutDragged.slice(insertIdx)];
      await Promise.all(reordered.map((p, i) => api.movePage(p.id, action.groupId, i)));
    } else if (action.type === 'group-into-group') {
      const siblings = tree.filter(n => n.parent_id === action.parentId);
      const maxOrder = siblings.reduce((m, n) => Math.max(m, n.sort_order ?? 0), 0);
      await api.moveCategory(action.groupId, action.parentId, maxOrder + 1);
    } else if (action.type === 'group-reorder') {
      const allCats = flattenTree(tree).map(f => ({ ...f }));
      const siblings = sortGroups(allCats.filter(c => { const node = findNode(tree, c.id); return node?.parent_id === action.parentId; }), 'manual');
      const withoutDragged = siblings.filter(c => c.id !== action.groupId);
      const insertIdx = action.beforeId ? withoutDragged.findIndex(c => c.id === action.beforeId) : withoutDragged.length;
      const reordered = [...withoutDragged.slice(0, insertIdx), { id: action.groupId }, ...withoutDragged.slice(insertIdx)];
      await Promise.all(reordered.map((c, i) => api.moveCategory(c.id, action.parentId ?? null, i)));
    }
    await loadAll(search);
  }

  function findNode(nodes, id) {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children || [], id);
      if (found) return found;
    }
    return null;
  }

  function selectPage(p) { setCurrent(p); setEditing(false); setStatus(''); }
  function startEdit() {
    if (!current) return;
    setEditData({ category: current.category, category_id: current.category_id, title: current.title, content: current.content });
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
      await loadAll(search);
    } catch (e) { setStatus('Error saving'); }
    finally { setSaving(false); }
  }

  async function deletePage() {
    if (!current || !confirm(`Delete "${current.title}"?`)) return;
    await api.deletePage(current.id);
    setPages(prev => prev.filter(p => p.id !== current.id));
    setCurrent(null);
  }

  async function createPage() {
    if (!newPage.title.trim() || !newPage.category_id) return;
    const created = await api.createPage({ title: newPage.title.trim(), category_id: parseInt(newPage.category_id) });
    await loadAll(search);
    setPageModal(false);
    setNewPage({ category_id: '', title: '' });
    selectPage(created);
    setTimeout(() => startEdit(), 50);
  }

  async function createGroup() {
    if (!newGroup.name.trim()) return;
    await api.createCategory(newGroup.name.trim(), newGroup.parent_id ? parseInt(newGroup.parent_id) : null);
    await loadAll(search);
    setGroupModal(false);
    setNewGroup({ name: '', parent_id: '' });
  }

  const toggleCat = (id) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  const currentSort = SORT_MODES.find(m => m.key === sortMode);

  if (showImport) return (
    <Import
      onBack={() => setShowImport(false)}
      onImported={() => { loadAll(); setShowImport(false); }}
    />
  );

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* ── Sidebar ── */}
        <div className="sidebar">
          <div className="sidebar-header">
            <Icon d={ICONS.book} size={16} />
            AntonLabs Wiki
            <div className="sidebar-header-right" ref={sortMenuRef} style={{ position: 'relative' }}>
              <button className={`sort-btn${sortMode !== 'manual' ? ' active' : ''}`} onClick={() => setShowSortMenu(s => !s)} title="Sort order">
                <Icon d={ICONS.sort} size={12} />
                {currentSort.label}
              </button>
              {showSortMenu && (
                <div className="sort-menu">
                  {SORT_MODES.map(m => (
                    <div key={m.key} className={`sort-option${sortMode === m.key ? ' active' : ''}`} onClick={() => { setSortMode(m.key); setShowSortMenu(false); }}>
                      <Icon d={m.icon} size={12} /> {m.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="sort-btn" onClick={() => setShowImport(true)} title="Import from Obsidian">
              <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" size={12} />
            </button>
          </div>

          <div className="search-wrap">
            <span className="search-icon"><Icon d={ICONS.search} size={13} /></span>
            <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search…" style={{ paddingLeft: 28 }} />
          </div>

          <div className="tree">
            {loading && <div style={{ padding: '16px', color: 'var(--text3)', fontSize: 11 }}>Loading…</div>}
            {sortedTopLevel.map((node, idx) => (
              <React.Fragment key={node.id}>
                <DropZone
                  show={sortMode === 'manual'}
                  active={dragState.overZone === `top-${idx}`}
                  onDragOver={() => setDragState(s => ({ ...s, overZone: `top-${idx}` }))}
                  onDragLeave={() => setDragState(s => ({ ...s, overZone: null }))}
                  onDrop={() => { if (dragState.type === 'group') handleDrop({ type: 'group-reorder', groupId: dragState.id, parentId: null, beforeId: node.id }); setDragState({}); }}
                />
                <TreeNode
                  node={node} pages={pages} current={current} collapsed={collapsed}
                  onToggle={toggleCat} onSelect={selectPage} depth={0}
                  sortMode={sortMode} onDrop={handleDrop} dragState={dragState} setDragState={setDragState}
                />
              </React.Fragment>
            ))}
            <DropZone
              show={sortMode === 'manual'}
              active={dragState.overZone === 'top-end'}
              onDragOver={() => setDragState(s => ({ ...s, overZone: 'top-end' }))}
              onDragLeave={() => setDragState(s => ({ ...s, overZone: null }))}
              onDrop={() => { if (dragState.type === 'group') handleDrop({ type: 'group-reorder', groupId: dragState.id, parentId: null, beforeId: null }); setDragState({}); }}
            />
          </div>

          {/* ── Attachments section ── */}
          <SidebarAttachments onPreview={setPreviewAttachment} />

          <div className="sidebar-btns">
            <button className="new-btn" onClick={() => setGroupModal(true)}>
              <Icon d={ICONS.folder} size={12} /> New group
            </button>
            <button className="new-btn" onClick={() => setPageModal(true)}>
              <Icon d={ICONS.plus} size={12} /> New page
            </button>
          </div>
        </div>

        {/* ── Main ── */}
        <div className="main">
          <div className="topbar">
            <div className="topbar-left">
              {current
                ? <><span className="breadcrumb">{current.category}</span><span className="sep">/</span><span className="page-title">{current.title}</span></>
                : <span className="breadcrumb">Select a page</span>}
            </div>
            <div className="topbar-right">
              {status && <span className="status">{status}</span>}
              {current && !editing && <>
                <button className="danger" onClick={deletePage}><Icon d={ICONS.trash} size={12} /> Delete</button>
                <button className="primary" onClick={startEdit}><Icon d={ICONS.edit} size={12} /> Edit</button>
              </>}
              {editing && <>
                <button onClick={cancelEdit}><Icon d={ICONS.x} size={12} /> Cancel</button>
                <button className="primary" onClick={savePage} disabled={saving}>
                  {saving ? <><span className="spin"><Icon d={ICONS.loader} size={12} /></span> Saving…</> : <><Icon d={ICONS.save} size={12} /> Save</>}
                </button>
              </>}
            </div>
          </div>
          <div className="content">
            {!current && <div className="empty"><Icon d={ICONS.book} size={36} /><p>Select a page or create a new one</p></div>}
            {current && !editing && (
              <div className="viewer" dangerouslySetInnerHTML={{ __html: mdToHtml(current.content) }} />
            )}
            {current && editing && (
              <div className="editor">
                <div className="editor-meta">
                  <select value={editData.category_id || ''} onChange={e => setEditData(d => ({ ...d, category_id: e.target.value }))}>
                    <option value="">Select group…</option>
                    {flatCats.map(c => <option key={c.id} value={c.id}>{'  '.repeat(c.depth)}{c.depth > 0 ? '└ ' : ''}{c.name}</option>)}
                  </select>
                  <input value={editData.title} onChange={e => setEditData(d => ({ ...d, title: e.target.value }))} placeholder="Page title" />
                </div>
                <textarea value={editData.content} onChange={e => setEditData(d => ({ ...d, content: e.target.value }))} placeholder="Write markdown here…" />
                <span className="editor-hint">Supports Markdown: headings, code blocks, tables, lists, bold, italic</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Preview modal ── */}
      {previewAttachment && (
        <PreviewModal attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />
      )}

      {/* ── New page modal ── */}
      {pageModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPageModal(false)}>
          <div className="modal">
            <h3>New page</h3>
            <select value={newPage.category_id} onChange={e => setNewPage(d => ({ ...d, category_id: e.target.value }))} autoFocus>
              <option value="">Select a group…</option>
              {flatCats.map(c => <option key={c.id} value={c.id}>{'  '.repeat(c.depth)}{c.depth > 0 ? '└ ' : ''}{c.name}</option>)}
            </select>
            <input value={newPage.title} onChange={e => setNewPage(d => ({ ...d, title: e.target.value }))} placeholder="Page title" onKeyDown={e => e.key === 'Enter' && createPage()} />
            <div className="modal-btns">
              <button onClick={() => setPageModal(false)}>Cancel</button>
              <button className="primary" onClick={createPage}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* ── New group modal ── */}
      {groupModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setGroupModal(false)}>
          <div className="modal">
            <h3>New group</h3>
            <input value={newGroup.name} onChange={e => setNewGroup(d => ({ ...d, name: e.target.value }))} placeholder="Group name" autoFocus onKeyDown={e => e.key === 'Enter' && createGroup()} />
            <select value={newGroup.parent_id} onChange={e => setNewGroup(d => ({ ...d, parent_id: e.target.value }))}>
              <option value="">No parent (top level)</option>
              {flatCats.map(c => <option key={c.id} value={c.id}>{'  '.repeat(c.depth)}{c.depth > 0 ? '└ ' : ''}{c.name}</option>)}
            </select>
            <div className="modal-btns">
              <button onClick={() => setGroupModal(false)}>Cancel</button>
              <button className="primary" onClick={createGroup}>Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}