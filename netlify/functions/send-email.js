const nodemailer = require('nodemailer');
const https = require('https');
const http = require('http');

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let to_name, to_email, order_number, order_summary_html, pdf_base64, pdf_filename, webhook_payload;
  try {
    ({ to_name, to_email, order_number, order_summary_html, pdf_base64, pdf_filename, webhook_payload } = JSON.parse(event.body));
  } catch (parseErr) {
    console.error('Body parse error:', parseErr.message, '— body length:', (event.body || '').length);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Fetch logo and embed via CID so it shows without "display images" permission
  let logoBuffer = null;
  try {
    logoBuffer = await fetchBuffer('https://architectkitchen.netlify.app/img/fragmentologo.png');
  } catch (e) {
    console.warn('Could not fetch logo:', e.message);
  }

  const attachments = [];
  if (logoBuffer) {
    attachments.push({ filename: 'fragmentologo.png', content: logoBuffer, cid: 'logo@fragmento', contentType: 'image/png', contentDisposition: 'inline' });
  }
  if (pdf_base64) {
    attachments.push({
      filename: pdf_filename || 'Bestellung.pdf',
      content: Buffer.from(pdf_base64, 'base64'),
      contentType: 'application/pdf',
    });
  }

  const logoImgTag = logoBuffer
    ? `<div style="margin-bottom:16px"><img src="cid:logo@fragmento" alt="Fragmento" style="height:70px;object-fit:contain" /></div>`
    : '';

  const mailOptions = {
    from: `"Fragmento" <${process.env.SMTP_FROM}>`,
    to: to_email,
    subject: `Bestellbestätigung #${order_number}`,
    html: `
      ${logoImgTag}
      <p>Hallo ${to_name},</p>
      <p>vielen Dank für deine Bestellung!</p>
      ${order_summary_html}
      <p>Dein Fragmento-Team</p>
    `,
    attachments,
  };

  try {
    console.log(`Sending email to ${to_email}, order #${order_number}, pdf: ${!!pdf_base64}, logo: ${!!logoBuffer}`);
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to_email}`);
  } catch (err) {
    console.error('SMTP error:', err.message, err.code || '', err.response || '');
    // Fallback: retry without PDF so the email still arrives
    try {
      console.log('Retrying without PDF attachment...');
      const fallbackAttachments = attachments.filter(a => a.cid === 'logo@fragmento');
      await transporter.sendMail({ ...mailOptions, attachments: fallbackAttachments });
      console.log(`Email sent to ${to_email} (without PDF)`);
      return { statusCode: 200, body: JSON.stringify({ success: true, warning: 'PDF attachment skipped: ' + err.message }) };
    } catch (err2) {
      console.error('SMTP error (fallback):', err2.message, err2.code || '', err2.response || '');
      return { statusCode: 500, body: JSON.stringify({ error: err2.message }) };
    }
  }

  // Fire n8n webhook server-side and await it (serverless functions are killed on return)
  if (webhook_payload) {
    try {
      const n8nUrl = new URL(process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/kitchen-order-callback');
      const lib = n8nUrl.protocol === 'https:' ? https : http;
      const body = JSON.stringify(webhook_payload);
      await new Promise((resolve) => {
        const req = lib.request({
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
        }, (res) => {
          res.resume(); // drain response so connection closes
          res.on('end', () => {
            console.log(`n8n webhook fired, status: ${res.statusCode}`);
            resolve();
          });
        });
        req.on('error', (err) => {
          console.warn('n8n webhook error:', err.message);
          resolve(); // don't let webhook failure block the response
        });
        req.write(body);
        req.end();
      });
    } catch (e) {
      console.warn('Could not fire n8n webhook:', e.message);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
