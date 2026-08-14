import { Router } from 'express';
import { exec } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Endpoint: POST /deploy-webhook or POST /api/deploy-webhook
router.post(['/deploy-webhook', '/'], (req, res) => {
  const secret = process.env.WEBHOOK_SECRET;

  // HMAC SHA256 Signature Verification if secret is configured
  if (secret) {
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);
    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');

    if (signature && signature !== expectedSignature) {
      return res.status(401).json({
        success: false,
        message: 'Invalid HMAC signature'
      });
    }
  }

  console.log('📬 Deployment webhook triggered from GitHub!');

  // Respond immediately so GitHub Webhook call doesn't timeout
  res.status(200).json({
    success: true,
    message: 'Auto-deployment process initiated asynchronously'
  });

  // Execute deployment script in background
  const scriptPath = path.resolve(__dirname, '../../scripts/deploy-server.sh');
  exec(`bash "${scriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Background deployment error: ${error.message}`);
      console.error(stderr);
      return;
    }
    console.log(`✅ Background deployment succeeded:\n${stdout}`);
  });
});

export default router;
