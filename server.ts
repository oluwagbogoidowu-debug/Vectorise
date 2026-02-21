import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

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

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

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
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
