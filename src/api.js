const BASE = process.env.REACT_APP_API_URL || 'https://numeropicks-backend-1.onrender.com';

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

// Long-timeout fetch for the predict call — 3 minutes
async function apiLong(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 300000); // 5 min
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
    return res.json();
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new Error('Request timed out — server may be waking up, please try again in 30 seconds.');
    throw e;
  }
}

export const getGames        = ()          => api('/games');
export const getHistory      = (key, n=20) => api(`/history/${key}?limit=${n}`);
export const getAccuracy     = (key)       => api(`/accuracy/${key}`);
export const getNextDraw     = (key)       => api(`/next-draw/${key}`);
export const getScrapeStatus = ()          => api('/scrape-status');
export const predict         = (key)       => apiLong(`/predict/${key}`);
export const predictAsync    = (key)       => api(`/predict-async/${key}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body:'{}' });
export const predictResult   = (jobId)     => api(`/predict-result/${jobId}`);
export const scrapeAll       = ()          => api('/scrape-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
export const scrapeGame      = (key)       => api(`/scrape/${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
export const downloadUrl     = (key, fmt)  => `${BASE}/download/${key}/${fmt}`;
export const downloadsPage   = ()          => `${BASE}/downloads`;
