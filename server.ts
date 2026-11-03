import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import chatHandler from './api/chat.ts';
import triageHandler from './api/triage.ts';
import summaryHandler from './api/summary.ts';
import healthHandler from './api/health.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));

  // API Routes matching Vercel Serverless Functions
  app.post('/api/chat', async (req, res) => {
    await chatHandler(req, res);
  });

  app.post('/api/triage', async (req, res) => {
    await triageHandler(req, res);
  });

  app.post('/api/summary', async (req, res) => {
    await summaryHandler(req, res);
  });

  app.get('/api/health', async (req, res) => {
    await healthHandler(req, res);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PulseWay server running on http://localhost:${PORT}`);
  });
}

startServer();
