import { Router } from 'express';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Endpoint: POST /deploy-webhook or POST /api/deploy-webhook
router.post(['/deploy-webhook', '/'], (req, res) => {
  try {
    const secret = process.env.WEBHOOK_SECRET;

    // WEBHOOK_SECRET must be configured — reject all requests if missing
    if (!secret) {
      console.error('❌ WEBHOOK_SECRET is not configured. Rejecting deploy request.');
      return res.status(500).json({
        success: false,
        message: 'Webhook secret is not configured on the server'
      });
    }

    // HMAC SHA256 Signature Verification (mandatory)
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      return res.status(401).json({
        success: false,
        message: 'Missing x-hub-signature-256 header'
      });
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');

    // Use timingSafeEqual to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid HMAC signature'
      });
    }

    console.log('📬 Deployment webhook triggered from GitHub!');

  // Respond immediately so GitHub Webhook call doesn't timeout
  res.status(200).json({
    success: true,
    message: 'Auto-deployment process initiated asynchronously'
  });

    // Execute deployment script in background (execFile avoids shell injection, with 5 min timeout)
    const scriptPath = path.resolve(__dirname, '../../scripts/deploy-server.sh');
    execFile('bash', [scriptPath], { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      const timestamp = new Date().toISOString();
      if (error) {
        console.error(`[${timestamp}] ❌ Background deployment failed!`);
        console.error(`Exit Code: ${error.code || 'UNKNOWN'}, Signal: ${error.signal || 'NONE'}`);
        console.error(`Message: ${error.message}`);
        if (stderr) console.error(`STDERR:\n${stderr}`);
        if (stdout) console.log(`STDOUT (partial):\n${stdout}`);
        return;
      }
      console.log(`[${timestamp}] ✅ Background deployment succeeded!`);
      if (stdout) console.log(`Deployment Output:\n${stdout}`);
    });
  } catch (err) {
    console.error('❌ Synchronous error in deploy webhook:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to process deploy webhook'
    });
  }
});

export default router;
