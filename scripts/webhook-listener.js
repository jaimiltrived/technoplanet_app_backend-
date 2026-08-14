import http from 'node:http';
import { exec } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.WEBHOOK_PORT || 9000;
const SECRET = process.env.WEBHOOK_SECRET || 'rku_technoplanet_secret_key';

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && (req.url === '/deploy-webhook' || req.url === '/')) {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      // Signature verification if secret is configured
      const signature = req.headers['x-hub-signature-256'];
      if (signature && SECRET) {
        const expectedSignature = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
        if (signature !== expectedSignature) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid HMAC signature' }));
        }
      }

      console.log('📬 Webhook received! Triggering automatic server deployment...');
      const scriptPath = path.join(__dirname, 'deploy-server.sh');

      // Execute automated deployment script
      exec(`bash "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Deployment failed: ${error.message}`);
          console.error(stderr);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: error.message, stderr }));
        }

        console.log(`✅ Output:\n${stdout}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Deployment executed successfully', stdout }));
      });
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'UP', message: 'RKU Auto-Deploy Webhook Listener is active' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Automated Deployment Webhook Listener running on port ${PORT}`);
  console.log(`🔗 Endpoint: http://localhost:${PORT}/deploy-webhook`);
});
