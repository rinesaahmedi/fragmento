const https = require('https');
const http = require('http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const n8nUrl = new URL(
    process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/kitchen-order-callback'
  );

  const body = event.body || '';
  const lib = n8nUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    const req = lib.request(
      {
        hostname: n8nUrl.hostname,
        port: n8nUrl.port || (n8nUrl.protocol === 'https:' ? 443 : 80),
        path: n8nUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'n8n-webhook-forwarder/1.0',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log(`n8n response [${res.statusCode}]:`, data.slice(0, 300));
          resolve({ statusCode: res.statusCode, body: data });
        });
      }
    );

    req.on('error', (err) => {
      console.error('request error:', err.message);
      resolve({ statusCode: 500, body: err.message });
    });

    req.write(body);
    req.end();
  });
};
