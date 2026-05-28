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
  pages:      ()           => req('GET',    '/pages'),
  search:     (q)          => req('GET',    `/pages?search=${encodeURIComponent(q)}`),
  page:       (id)         => req('GET',    `/pages/${id}`),
  createPage: (data)       => req('POST',   '/pages', data),
  updatePage: (id, data)   => req('PUT',    `/pages/${id}`, data),
  deletePage: (id)         => req('DELETE', `/pages/${id}`),
  categories: ()           => req('GET',    '/categories'),
};
