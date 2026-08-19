import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { pushNotificationManager } from './services/pushNotificationManager.js';
import { db } from './api/lib/firebaseAdmin.js';

// @ts-ignore
import provisionPartner from './api/admin/provision-partner.js';
// @ts-ignore
import deleteUserAdmin from './api/admin/delete-user.js';
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
// @ts-ignore
import subscribeHandler from './api/subscribe.js';
// @ts-ignore
import sendHandler from './api/send.js';
// @ts-ignore
import ogHandler from './api/og.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.post('/api/admin/provision-partner', provisionPartner);
  app.post('/api/admin/delete-user', deleteUserAdmin);
  app.post('/api/flutterwave/initiate', initiatePayment);
  app.get('/api/flutterwave/check-status', checkStatus);
  app.post('/api/flutterwave/webhook', webhook);
  app.get('/api/payment-success', paymentSuccess);
  app.get('/payment-success', paymentSuccess);
  app.get('/api/vapid-key', vapidKeyHandler);
  app.post('/api/subscribe', subscribeHandler);
  app.post('/api/send', sendHandler);
  app.get('/api/og', ogHandler);

  // Dynamic Sitemap XML handler
  app.get('/sitemap.xml', async (req: any, res: any) => {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'vectorise.online';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;

    const slugify = (text: string): string => {
      if (!text) return '';
      return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    const staticRoutes = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/discover', priority: '0.8', changefreq: 'daily' },
      { url: '/blog', priority: '0.9', changefreq: 'daily' },
      { url: '/login', priority: '0.5', changefreq: 'monthly' },
      { url: '/signup', priority: '0.5', changefreq: 'monthly' },
      { url: '/partner/apply', priority: '0.6', changefreq: 'monthly' },
      { url: '/privacy-policy', priority: '0.3', changefreq: 'monthly' },
      { url: '/terms', priority: '0.3', changefreq: 'monthly' },
      { url: '/refund-policy', priority: '0.3', changefreq: 'monthly' }
    ];

    let dynamicRoutes: Array<{ url: string; lastmod: string; priority: string; changefreq: string }> = [];

    try {
      if (db) {
        const categories = ['Sprint', 'RiseBlog', 'Ignite', 'Challenge'];
        for (const cat of categories) {
          try {
            const snapshot = await db.collection('experiences').doc(cat).collection('items').get();
            for (const docSnap of snapshot.docs) {
              const itemData = docSnap.data();
              let data = itemData;
              try {
                const infoSnap = await docSnap.ref.collection('sprintdetails').doc('info').get();
                if (infoSnap.exists) data = { ...itemData, ...infoSnap.data() };
              } catch (e) {}

              if (data.deleted === true || data.published === false) continue;

              let lastmodDate = new Date();
              if (data.updatedAt) {
                try {
                  lastmodDate = typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate() : new Date(data.updatedAt);
                } catch (e) {
                  lastmodDate = new Date();
                }
              }
              const lastmod = isNaN(lastmodDate.getTime()) ? new Date().toISOString() : lastmodDate.toISOString();

              if ((data.contentType === 'blog' || cat === 'RiseBlog') && (data.approvalStatus === 'approved' || !data.approvalStatus)) {
                let audienceSlug = 'general';
                if (Array.isArray(data.audience)) {
                  const cleaned = data.audience.map((a: any) => String(a).trim()).filter(Boolean);
                  if (cleaned.length === 1) {
                    audienceSlug = slugify(cleaned[0]) || 'general';
                  }
                } else if (typeof data.audience === 'string' && data.audience.trim()) {
                  audienceSlug = slugify(data.audience) || 'general';
                }

                const titleSlug = slugify(data.title || data.blogTitle || docSnap.id) || docSnap.id;
                dynamicRoutes.push({
                  url: `/${audienceSlug}/${titleSlug}`,
                  lastmod,
                  priority: '0.8',
                  changefreq: 'weekly'
                });
              } else if (data.contentType !== 'blog' && data.contentType !== 'ignite' && cat !== 'RiseBlog' && cat !== 'Ignite') {
                dynamicRoutes.push({
                  url: `/sprint/preview/${docSnap.id}`,
                  lastmod,
                  priority: '0.7',
                  changefreq: 'weekly'
                });
              }
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('[Sitemap] Error fetching dynamic pages from Firestore:', err);
    }

    const nowIso = new Date().toISOString();
    const allRoutes = [
      ...staticRoutes.map(r => ({ ...r, lastmod: nowIso })),
      ...dynamicRoutes
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes.map(route => `  <url>
    <loc>${baseUrl}${route.url}</loc>
    <lastmod>${route.lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  });

  // Dynamic robots.txt handler
  app.get('/robots.txt', (req: any, res: any) => {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'vectorise.online';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;

    const content = `User-agent: *
Allow: /
Allow: /blog
Allow: /discover
Allow: /sprint/preview/
Allow: /general/
Allow: /student/
Allow: /students/

Disallow: /admin/
Disallow: /coach/
Disallow: /participant/
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml`;

    res.header('Content-Type', 'text/plain');
    res.send(content);
  });

  // Puppeteer image card generation endpoint
  app.all(['/generate', '/api/generate'], async (req: any, res: any) => {
    const data = req.method === 'POST' ? req.body : req.query;

    const name = data?.name || "Emmanuel";
    const sprint_name = data?.sprint_name || "Gain Clarity First";
    const outcome = data?.outcome || "I realized I’ve been forcing a path that doesn’t align with how I naturally think and work.";

    try {
      const browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
          '--no-zygote'
        ]
      });

      const page = await browser.newPage();

      let html = fs.readFileSync('template.html', 'utf8');

      const bgGradient = data?.bg_gradient || "linear-gradient(135deg, #040d0a 0%, #081711 50%, #0e261d 100%)";
      const customFont = data?.custom_font || "'Inter', sans-serif";
      const textFont = data?.text_font || "'Playfair Display', serif";
      const fontLink = data?.font_link || "";
      const badgeText = data?.badge_text || "Sprint Accomplished";

      html = html
        .replace('{{name}}', name)
        .replace('{{sprint_name}}', sprint_name)
        .replace('{{outcome}}', outcome)
        .replace('{{badge_text}}', badgeText)
        .replace('{{{font_link}}}', fontLink)
        .replace('{{{bg_gradient}}}', bgGradient)
        .replace('{{{custom_font}}}', customFont)
        .replace('{{{text_font}}}', textFont);

      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await page.setViewport({ width: 600, height: 800 });

      // Ensure fonts are fully loaded before rendering screenshot
      try {
        await page.evaluateHandle(() => document.fonts.ready);
      } catch (fontErr) {
        console.warn('Font loading wait warning (continuing):', fontErr);
      }

      const buffer = await page.screenshot({ type: 'png' });

      await browser.close();

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'inline');
      res.send(buffer);
    } catch (error: any) {
      console.error('Error generating image card with Puppeteer:', error);
      res.status(500).setHeader('Content-Type', 'text/plain').send('Failed to generate image: ' + (error?.message || error));
    }
  });

  // Get generated file helper route
  app.get('/api/output/:filename', (req, res) => {
    const filePath = path.join(process.cwd(), req.params.filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('File not found');
    }
  });

  app.post('/api/notifications/subscribe', async (req, res) => {
    const { userId, subscription, fcmToken } = req.body;
    const token = fcmToken || subscription;
    if (!userId || !token) return res.status(400).json({ error: 'userId and fcmToken/subscription are required' });
    try {
      const success = await pushNotificationManager.saveSubscription(userId, token);
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
  
  app.post('/api/notifications/trigger-update', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    try {
      await pushNotificationManager.triggerUpdate(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to trigger notification' });
    }
  });

  app.post('/api/notifications/send-push', async (req, res) => {
    const { userId, title, body, url, tag, bypassActiveCheck } = req.body;
    if (!userId || !title || !body) return res.status(400).json({ error: 'userId, title, and body are required' });
    try {
      const success = await pushNotificationManager.sendPush(userId, { title, body, url, tag }, bypassActiveCheck || false);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send push notification' });
    }
  });

  app.post('/api/notifications/broadcast', async (req, res) => {
    const { userIds, title, body, url, tag } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !title || !body) {
      return res.status(400).json({ error: 'userIds (array), title, and body are required' });
    }
    try {
      const result = await pushNotificationManager.broadcastPush(userIds, { title, body, url, tag });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('[Server] Broadcast failed:', error);
      res.status(500).json({ error: 'Failed to broadcast notifications' });
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

  app.post('/api/notifications/track-delivered', async (req, res) => {
    const { logId } = req.body;
    if (!logId) return res.status(400).json({ error: 'logId is required' });
    try {
      await db.collection('push_delivery_logs').doc(logId).update({
        status: 'delivered',
        deliveredAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (error) {
      console.error('[Server] Failed to track delivered notification:', error);
      res.status(500).json({ error: 'Failed to update delivery log' });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Background Job for Push Notifications (runs every 1 minute to ensure prompt delivery)
  setInterval(() => {
    pushNotificationManager.processTriggers().catch(err => {
      console.error('[Server] Push trigger processing failed:', err);
    });
  }, 1 * 60 * 1000);

  let vite: any;
  if (process.env.NODE_ENV !== 'production') {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
  }

  // Intercept exact /sprint and /track routes for dynamic OG tags
  app.get(['/sprint/:sprintId', '/track/:trackId'], async (req, res, next) => {
    const sprintId = req.params.sprintId;
    const trackId = req.params.trackId;
    
    if ((sprintId && typeof sprintId === 'string') || (trackId && typeof trackId === 'string')) {
      try {
        let docData: any = null;
        if (sprintId && typeof sprintId === 'string') {
          let sDoc = await db.collection('experiences').doc('Sprint').collection('items').doc(sprintId).collection('sprintdetails').doc('info').get();
          if (!sDoc.exists) {
            sDoc = await db.collection('experiences').doc('RiseBlog').collection('items').doc(sprintId).collection('sprintdetails').doc('info').get();
          }
          if (!sDoc.exists) {
            sDoc = await db.collection('experiences').doc('Ignite').collection('items').doc(sprintId).collection('sprintdetails').doc('info').get();
          }
          if (!sDoc.exists) {
            sDoc = await db.collection('experiences').doc('Challenge').collection('items').doc(sprintId).collection('sprintdetails').doc('info').get();
          }
          if (!sDoc.exists) {
            sDoc = await db.collection('experiences').doc(sprintId).collection('sprintdetails').doc('info').get();
          }
          if (sDoc.exists) docData = sDoc.data();
        } else if (trackId && typeof trackId === 'string') {
          const doc = await db.collection('tracks').doc(trackId).get();
          if (doc.exists) docData = doc.data();
        }

        if (docData) {
          let htmlPath = process.env.NODE_ENV === 'production' 
            ? path.join(__dirname, 'dist', 'index.html')
            : path.join(__dirname, 'index.html');
          
          let html = fs.readFileSync(htmlPath, 'utf-8');
          
          const title = docData.title || "Vectorise";
          const description = docData.subtitle || docData.description || "Start your personal growth journey today.";
          const image = (docData.coverImageUrl || "https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd").replace(/&/g, '&amp;');
          const url = `https://${req.hostname}${req.url}`;
          
          const ogTags = `
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta name="twitter:image" content="${image}" />
          `;

          html = html.replace('</title>', `</title>\n${ogTags}`);
          
          if (process.env.NODE_ENV !== 'production' && vite) {
            html = await vite.transformIndexHtml(req.url, html);
          }
          
          return res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        }
      } catch (err) {
        console.error('Error serving dynamic OG tags:', err);
      }
    }
    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && vite) {
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Start real-time notification listener for pushes
    pushNotificationManager.startNotificationListener();

    // Start background processor for failed/pending pushes and retry queue
    setInterval(() => {
      pushNotificationManager.processPendingNotifications().catch(err => {
        console.error('[Server] Pending notifications processing failed:', err);
      });
    }, 60 * 1000);

    // Run initial trigger check and pending processor on startup
    pushNotificationManager.processTriggers().catch(err => {
      console.error('[Server] Initial push trigger processing failed:', err);
    });

    pushNotificationManager.processPendingNotifications().catch(err => {
      console.error('[Server] Initial push pending retrieval failed:', err);
    });
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

