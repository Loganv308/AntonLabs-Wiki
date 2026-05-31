import React, { useState, useRef, useCallback } from 'react';
import { api } from './api.js';

const css = String.raw;
const styles = css`
  .import-page { max-width: 680px; margin: 0 auto; padding: 32px 40px; }
  .import-page h1 { font-size: 18px; font-weight: 600; color: var(--text); margin: 0 0 6px; }
  .import-page .sub { font-size: 12px; color: var(--text3); margin: 0 0 28px; }

  .drop-area {
    border: 2px dashed var(--border2); border-radius: var(--radius-lg);
    padding: 40px 24px; text-align: center; cursor: pointer;
    transition: all .15s; color: var(--text3);
    background: var(--bg2);
  }
  .drop-area.over { border-color: var(--accent); background: var(--accent-dim); color: var(--accent); }
  .drop-area svg { margin-bottom: 10px; opacity: .5; }
  .drop-area p { font-size: 13px; margin: 0 0 4px; }
  .drop-area span { font-size: 11px; }

  .or-divider { display: flex; align-items: center; gap: 12px; margin: 16px 0; color: var(--text3); font-size: 11px; }
  .or-divider::before, .or-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }

  .file-btns { display: flex; gap: 8px; }
  .file-btns button { flex: 1; font-size: 12px; }

  .file-list { margin: 20px 0 0; }
  .file-list h3 { font-size: 11px; font-weight: 600; color: var(--text3); letter-spacing: .08em; text-transform: uppercase; margin: 0 0 8px; }
  .file-item {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 10px; border-radius: var(--radius);
    background: var(--bg2); margin-bottom: 4px; font-size: 12px;
  }
  .file-item .name { flex: 1; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .file-item .cat { font-size: 10px; color: var(--text3); white-space: nowrap; }
  .file-item .badge {
    font-size: 10px; padding: 2px 6px; border-radius: 3px; white-space: nowrap;
    background: var(--bg3); color: var(--text3);
  }
  .file-item .badge.md  { background: var(--accent-dim); color: var(--accent); }
  .file-item .badge.img { background: #1a3a2a; color: #4ade80; }
  .file-item .badge.pdf { background: #3a1a1a; color: #f87171; }
  .file-item .remove { cursor: pointer; opacity: .4; flex-shrink: 0; }
  .file-item .remove:hover { opacity: 1; }

  .preview-section { margin: 24px 0 0; }
  .preview-section h3 { font-size: 11px; font-weight: 600; color: var(--text3); letter-spacing: .08em; text-transform: uppercase; margin: 0 0 8px; }
  .preview-item {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 10px; font-size: 12px; color: var(--text2);
    border-left: 2px solid var(--border); margin-bottom: 3px;
  }
  .preview-item .p-name { flex: 1; color: var(--text); }
  .preview-item .p-cat { font-size: 10px; color: var(--text3); }

  .summary-bar {
    display: flex; gap: 16px; padding: 12px 14px;
    background: var(--bg2); border-radius: var(--radius); margin: 16px 0;
    font-size: 12px; color: var(--text2);
  }
  .summary-bar strong { color: var(--text); }

  .actions { display: flex; gap: 8px; margin-top: 20px; align-items: center; }
  .actions .spacer { flex: 1; }

  .progress-wrap { margin: 16px 0; }
  .progress-bar-outer { height: 6px; background: var(--bg3); border-radius: 3px; overflow: hidden; margin: 6px 0 4px; }
  .progress-bar-inner { height: 100%; background: var(--accent); border-radius: 3px; transition: width .3s; }
  .progress-label { font-size: 11px; color: var(--text3); }

  .result-box {
    padding: 14px 16px; border-radius: var(--radius-lg);
    font-size: 13px; margin-top: 20px; display: flex; align-items: center; gap: 8px;
  }
  .result-box.success { background: #0d2e1a; color: #4ade80; border: 1px solid #166534; }
  .result-box.error   { background: #2e0d0d; color: #f87171; border: 1px solid #7f1d1d; }

  .back-btn {
    font-size: 12px; margin-bottom: 20px; display: inline-flex; align-items: center;
    gap: 5px; color: var(--text3); background: none; border: none; cursor: pointer; padding: 0;
  }
  .back-btn:hover { color: var(--text); }
`;

function Icon({ d, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  upload:  'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
  file:    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
  folder:  'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
  x:       'M18 6 6 18 M6 6l12 12',
  check:   'M20 6 9 17l-5-5',
  chevron: 'M15 18l-6-6 6-6',
  image:   'M21 15l-5-5L5 21 M3 3h18v18H3z M8.5 8.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2',
  pdf:     'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 13h6 M9 17h3',
};

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

function fileType(name) {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (ext === '.md')  return 'md';
  if (ext === '.pdf') return 'pdf';
  if (IMAGE_EXTS.includes(ext)) return 'img';
  return 'other';
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function Import({ onBack, onImported }) {
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [over, setOver] = useState(false);
  const mdInput = useRef();
  const anyInput = useRef();

  function addFiles(newFiles) {
    const arr = Array.from(newFiles);
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...arr.filter(f => !names.has(f.name))];
    });
    setPreview(null);
    setResult(null);
  }

  function removeFile(name) {
    setFiles(prev => prev.filter(f => f.name !== name));
    setPreview(null);
  }

  const onDrop = useCallback(e => {
    e.preventDefault();
    setOver(false);
    addFiles(e.dataTransfer.files);
  }, []);

  async function doPreview() {
    if (!files.length) return;
    setPreviewing(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      const data = await api.importPreview(fd);
      setPreview(data);
    } catch (e) {
      setResult({ ok: false, message: e.message });
    } finally { setPreviewing(false); }
  }

  async function doImport() {
    if (!files.length) return;
    setImporting(true);
    setProgress(10);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      setProgress(40);
      const data = await api.importCommit(fd);
      setProgress(100);
      setResult({ ok: true, message: `Successfully imported ${data.imported} page${data.imported !== 1 ? 's' : ''}.` });
      setFiles([]);
      setPreview(null);
      onImported?.();
    } catch (e) {
      setResult({ ok: false, message: e.message });
    } finally { setImporting(false); }
  }

  const mdCount  = files.filter(f => fileType(f.name) === 'md').length;
  const zipCount = files.filter(f => f.name.endsWith('.zip')).length;
  const imgCount = files.filter(f => fileType(f.name) === 'img').length;
  const pdfCount = files.filter(f => fileType(f.name) === 'pdf').length;

  return (
    <>
      <style>{styles}</style>
      <div className="import-page">
        <button className="back-btn" onClick={onBack}>
          <Icon d={ICONS.chevron} size={13} /> Back to wiki
        </button>

        <h1>Import from Obsidian</h1>
        <p className="sub">Upload a vault .zip, individual .md files, images, and PDFs. Folder structure becomes groups.</p>

        {/* Drop area */}
        <div
          className={`drop-area${over ? ' over' : ''}`}
          onDragOver={e => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          onClick={() => anyInput.current.click()}
        >
          <Icon d={ICONS.upload} size={32} />
          <p>Drop files or click to browse</p>
          <span>.zip vault, .md files, images, PDFs</span>
        </div>

        <div className="or-divider">or</div>

        <div className="file-btns">
          <button onClick={e => { e.stopPropagation(); mdInput.current.click(); }}>
            <Icon d={ICONS.file} size={13} /> Select .md files
          </button>
          <button onClick={e => { e.stopPropagation(); anyInput.current.click(); }}>
            <Icon d={ICONS.folder} size={13} /> Select .zip / any files
          </button>
        </div>

        <input ref={mdInput}  type="file" accept=".md" multiple hidden
          onChange={e => addFiles(e.target.files)} />
        <input ref={anyInput} type="file" accept=".zip,.md,.png,.jpg,.jpeg,.gif,.webp,.svg,.pdf" multiple hidden
          onChange={e => addFiles(e.target.files)} />

        {/* File list */}
        {files.length > 0 && (
          <div className="file-list">
            <h3>{files.length} file{files.length !== 1 ? 's' : ''} selected</h3>
            {files.map(f => {
              const type = fileType(f.name);
              return (
                <div className="file-item" key={f.name}>
                  <Icon d={type === 'img' ? ICONS.image : type === 'pdf' ? ICONS.pdf : ICONS.file} size={13} />
                  <span className="name">{f.name}</span>
                  <span className="cat">{formatSize(f.size)}</span>
                  <span className={`badge ${type}`}>{type === 'other' ? 'zip' : type}</span>
                  <span className="remove" onClick={() => removeFile(f.name)}>
                    <Icon d={ICONS.x} size={12} />
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="preview-section">
            <div className="summary-bar">
              <span><strong>{preview.pages.length}</strong> pages</span>
              <span><strong>{preview.assets.filter(a => fileType(a.name) === 'img').length}</strong> images</span>
              <span><strong>{preview.assets.filter(a => fileType(a.name) === 'pdf').length}</strong> PDFs</span>
            </div>
            <h3>Pages to import</h3>
            {preview.pages.map((p, i) => (
              <div className="preview-item" key={i}>
                <Icon d={ICONS.file} size={12} />
                <span className="p-name">{p.name}</span>
                <span className="p-cat">{p.category}</span>
              </div>
            ))}
          </div>
        )}

        {/* Progress */}
        {importing && (
          <div className="progress-wrap">
            <div className="progress-bar-outer">
              <div className="progress-bar-inner" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-label">Importing… {progress}%</span>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`result-box ${result.ok ? 'success' : 'error'}`}>
            <Icon d={result.ok ? ICONS.check : ICONS.x} size={14} />
            {result.message}
          </div>
        )}

        {/* Actions */}
        {files.length > 0 && !importing && !result?.ok && (
          <div className="actions">
            <button onClick={() => { setFiles([]); setPreview(null); setResult(null); }}>
              Clear all
            </button>
            <span className="spacer" />
            {!preview && (
              <button onClick={doPreview} disabled={previewing}>
                {previewing ? 'Previewing…' : 'Preview import'}
              </button>
            )}
            <button className="primary" onClick={doImport}>
              Import {preview ? `${preview.pages.length} pages` : `${mdCount + zipCount + pdfCount + imgCount} file${mdCount + zipCount + pdfCount + imgCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {result?.ok && (
          <div className="actions">
            <span className="spacer" />
            <button className="primary" onClick={onBack}>Go to wiki</button>
          </div>
        )}
      </div>
    </>
  );
}