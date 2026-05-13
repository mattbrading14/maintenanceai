module.exports = async function handler(req, res) {
  try {
    const response = await fetch('https://mattbrading14.github.io/maintenanceai_public/');
    const html = await response.text();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
    res.status(response.ok ? 200 : 502).send(html);
  } catch (error) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(502).send(`<!doctype html><html><head><title>MaintenanceAI</title></head><body><h1>MaintenanceAI is loading</h1><p>Please refresh in a moment.</p></body></html>`);
  }
};
