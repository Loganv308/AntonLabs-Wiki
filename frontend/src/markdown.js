export function mdToHtml(md) {
  let h = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="code-block"${lang ? ` data-lang="${lang}"` : ''}><code>${code.trimEnd()}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/^### (.+)/gm, '<h3>$1</h3>')
    .replace(/^## (.+)/gm,  '<h2>$1</h2>')
    .replace(/^# (.+)/gm,   '<h1>$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^> (.+)/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  h = renderTables(h);
  h = renderLists(h);

  h = h.split(/\n{2,}/).map(p => {
    const t = p.trim();
    if (!t) return '';
    if (/^<(h[1-3]|pre|blockquote|ul|ol|hr|table)/.test(t)) return t;
    return `<p>${t}</p>`;
  }).join('\n');

  return h;
}

function renderTables(h) {
  return h.replace(/((?:\|.+\|\n?)+)/g, block => {
    const rows = block.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return block;
    const toTd = (r, tag) => r.split('|')
      .filter((_, i, a) => i > 0 && i < a.length - 1)
      .map(c => `<${tag}>${c.trim()}</${tag}>`).join('');
    const head = `<thead><tr>${toTd(rows[0], 'th')}</tr></thead>`;
    const body = rows.slice(2).map(r => `<tr>${toTd(r, 'td')}</tr>`).join('');
    return `<table>${head}<tbody>${body}</tbody></table>`;
  });
}

function renderLists(h) {
  h = h.replace(/((?:^- .+\n?)+)/gm, b =>
    `<ul>${b.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('')}</ul>`);
  h = h.replace(/((?:^\d+\. .+\n?)+)/gm, b =>
    `<ol>${b.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('')}</ol>`);
  return h;
}
