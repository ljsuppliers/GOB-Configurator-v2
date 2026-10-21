/**
 * GOB Configurator: AI exterior mockup via the Recraft API.
 * Vercel serverless function. Needs RECRAFT_API_TOKEN in the project env (Liam's account with credit).
 *
 * POST { action: 'generate', prompt, styleId?, size?, n? }  -> { images: [{ b64, mime }], credits }
 * POST { action: 'create-style', imageUrls: [...] }         -> { styleId }   (trains a house style from real GOB photos; run once)
 * POST { action: 'credits' }                                 -> { credits }
 */
const BASE = 'https://external.api.recraft.ai/v1';

// Real exterior photos of our buildings on gardenofficebuildings.co.uk (used to train the house style, max 10).
const HOUSE_PHOTOS = [
  'https://gardenofficebuildings.co.uk/wp-content/uploads/2024/11/Maxi-garden-office-building.png',
  'https://gardenofficebuildings.co.uk/wp-content/uploads/2024/11/Multi-6m-x-4m-garden-office.png',
  'https://gardenofficebuildings.co.uk/wp-content/uploads/2024/11/6x4-garden-office.png',
  'https://gardenofficebuildings.co.uk/wp-content/uploads/2024/07/garden-office.png',
  'https://gardenofficebuildings.co.uk/wp-content/uploads/2024/07/Garden-Office-Buildings.jpg',
  'https://gardenofficebuildings.co.uk/wp-content/uploads/2023/03/Midi-Garden-Office-Building.jpeg',
  'https://gardenofficebuildings.co.uk/wp-content/uploads/2021/09/Midi-Garden-Office-in-Sevenoaks-Kent-2.jpg',
  'https://gardenofficebuildings.co.uk/wp-content/uploads/2021/09/Maxi-Garden-Office-in-Petts-Wood-Orpington-2-1.jpg',
  'https://gardenofficebuildings.co.uk/wp-content/uploads/2021/07/Home-Garden-Office-Kent-8.jpg',
  'https://gardenofficebuildings.co.uk/wp-content/uploads/2021/06/Garden-Office-Sussex-1-scaled.jpg',
];

async function recraft(path, token, body, headers) {
  const r = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(headers || {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch (e) { /* plain text error */ }
  if (!r.ok) { const err = new Error((json && (json.message || json.error || json.detail)) || text || `Recraft ${r.status}`); err.status = r.status; throw err; }
  return json;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const token = process.env.RECRAFT_API_TOKEN;
  if (!token) return res.status(503).json({ error: 'RECRAFT_API_TOKEN is not set on the Vercel project. Add it (Project > Settings > Environment Variables) and redeploy.' });
  const q = req.body || {};
  try {
    if (q.action === 'credits') { const me = await recraft('/users/me', token); return res.status(200).json({ credits: me.credits, email: me.email }); }
    if (q.action === 'create-style') {
      const urls = Array.isArray(q.imageUrls) && q.imageUrls.length ? q.imageUrls.slice(0, 10) : HOUSE_PHOTOS;
      const st = await recraft('/styles', token, { style: 'realistic_image', model: 'recraftv3', image_urls: urls }); // v4 styles reject 'realistic_image'; v3 trained style tested 21 Oct 2026
      return res.status(200).json({ styleId: st.id, photos: urls.length });
    }
    // generate
    const prompt = String(q.prompt || '').slice(0, 1000);
    if (!prompt) return res.status(400).json({ error: 'prompt required' });
    const size = q.size || '1536x1024';
    const n = Math.max(1, Math.min(2, Number(q.n) || 1));
    const base = { prompt, size, n, response_format: 'b64_json', negative_prompt: (q.negative || 'brick, shed, log cabin, conservatory, people, text, watermark, blurry, cartoon') };
    let out;
    if (q.styleId) {
      try { out = await recraft('/images/generations', token, { ...base, style_id: q.styleId }); }
      catch (e) { if (e.status === 400 || e.status === 404) out = null; else throw e; } // bad/expired style: fall back to the stock style
    }
    if (!out) out = await recraft('/images/generations', token, { ...base, model: 'recraftv3', style: 'realistic_image', substyle: 'natural_light' });
    const images = (out.data || []).map((d) => ({ b64: d.b64_json, mime: 'image/png', id: d.image_id }));
    return res.status(200).json({ images, credits: out.credits, usedStyle: !!(q.styleId && out && !out._fallback) });
  } catch (e) {
    console.error('mockup error', e);
    return res.status(e.status === 401 ? 401 : 500).json({ error: e.status === 401 ? 'Recraft rejected the token (RECRAFT_API_TOKEN): check it is the API token from recraft.ai, not a login password.' : e.message });
  }
};
