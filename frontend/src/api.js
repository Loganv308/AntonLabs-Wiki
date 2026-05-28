const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.json();
}

export const api = {
  pages:          ()                       => req('GET',    '/pages'),
  search:         (q)                      => req('GET',    `/pages?search=${encodeURIComponent(q)}`),
  page:           (id)                     => req('GET',    `/pages/${id}`),
  createPage:     (data)                   => req('POST',   '/pages', data),
  updatePage:     (id, data)               => req('PUT',    `/pages/${id}`, data),
  deletePage:     (id)                     => req('DELETE', `/pages/${id}`),
  movePage:       (id, category_id, sort_order) => req('PATCH', `/pages/${id}/move`, { category_id, sort_order }),
  categories:     ()                       => req('GET',    '/categories'),
  categoryTree:   ()                       => req('GET',    '/categories/tree'),
  createCategory: (name, parent_id)        => req('POST',   '/categories', { name, parent_id }),
  moveCategory:   (id, parent_id, sort_order) => req('PATCH', `/categories/${id}/move`, { parent_id, sort_order }),
};