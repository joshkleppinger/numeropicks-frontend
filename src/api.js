const BASE = process.env.REACT_APP_API_URL || 'https://numeropicks-backend-1.onrender.com';

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const getGames      = ()          => api('/games');
export const getHistory    = (key, n=20) => api(`/history/${key}?limit=${n}`);
export const getAccuracy   = (key)       => api(`/accuracy/${key}`);
export const getNextDraw   = (key)       => api(`/next-draw/${key}`);
export const getScrapeStatus = ()        => api('/scrape-status');
export const predict       = (key)       => api(`/predict/${key}`);
export const scrapeAll     = ()          => api('/scrape-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
export const scrapeGame    = (key)       => api(`/scrape/${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
export const downloadUrl   = (key, fmt)  => `${BASE}/download/${key}/${fmt}`;
export const downloadsPage = ()          => `${BASE}/downloads`;
