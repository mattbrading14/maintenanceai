export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({error: 'Method not allowed'}); return; }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // Log request size for debugging
    const bodyStr = JSON.stringify(body);
    console.log('Request body size:', bodyStr.length, 'bytes');
    
    // Check if image data is present and log its size
    if (body.messages && body.messages[0] && body.messages[0].content) {
      const content = body.messages[0].content;
      if (Array.isArray(content)) {
        content.forEach((block, i) => {
          if (block.type === 'image') {
            console.log('Image block', i, 'data length:', block.source.data.length, 'media_type:', block.source.media_type);
          }
        });
      }
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    
    // Log error details if not OK
    if (!response.ok) {
      console.error('Anthropic error status:', response.status);
      console.error('Anthropic error body:', JSON.stringify(data));
    }
    
    res.status(response.status).json(data);
  } catch(e) {
    console.error('Proxy error:', e.message);
    res.status(500).json({error: e.message, detail: 'Proxy error'});
  }
}
