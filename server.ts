import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { pushNotificationManager } from './services/pushNotificationManager';

// @ts-ignore
import provisionPartner from './api/admin/provision-partner.js';
// @ts-ignore
import paymentSuccess from './api/payment-success.js';
// @ts-ignore
import initiatePayment from './api/flutterwave/initiate.js';
// @ts-ignore
import checkStatus from './api/flutterwave/check-status.js';
// @ts-ignore
import webhook from './api/flutterwave/webhook.js';
// @ts-ignore
import vapidKeyHandler from './api/vapid-key.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.post('/api/admin/provision-partner', provisionPartner);
  app.post('/api/flutterwave/initiate', initiatePayment);
  app.get('/api/flutterwave/check-status', checkStatus);
  app.post('/api/flutterwave/webhook', webhook);
  app.get('/api/payment-success', paymentSuccess);
  app.get('/payment-success', paymentSuccess);
  app.get('/api/vapid-key', vapidKeyHandler);

  app.post('/api/notifications/subscribe', async (req, res) => {
    const { userId, subscription } = req.body;
    if (!userId || !subscription) return res.status(400).json({ error: 'userId and subscription are required' });
    try {
      const success = await pushNotificationManager.saveSubscription(userId, subscription);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  });

  app.post('/api/notifications/trigger-completed', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    try {
      await pushNotificationManager.triggerCompleted(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to trigger notification' });
    }
  });

  app.post('/api/notifications/send-push', async (req, res) => {
    const { userId, title, body, url, tag } = req.body;
    if (!userId || !title || !body) return res.status(400).json({ error: 'userId, title, and body are required' });
    try {
      const success = await pushNotificationManager.sendPush(userId, { title, body, url, tag });
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send push notification' });
    }
  });

  app.post('/api/notifications/update-state', async (req, res) => {
    const { userId, state } = req.body;
    if (!userId || !state) return res.status(400).json({ error: 'userId and state are required' });
    try {
      await pushNotificationManager.updateNotificationState(userId, state);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update notification state' });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Background Job for Push Notifications (runs every 30 minutes)
  setInterval(() => {
    pushNotificationManager.processTriggers().catch(err => {
      console.error('[Server] Push trigger processing failed:', err);
    });
  }, 30 * 60 * 1000);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Run initial trigger check on startup
    pushNotificationManager.processTriggers().catch(err => {
      console.error('[Server] Initial push trigger processing failed:', err);
    });
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
