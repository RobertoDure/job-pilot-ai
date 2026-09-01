import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { PORT, WEB_DIST } from './config';
import { buildRouter } from './routes';

const app = express();
app.use(cors());
app.use(express.json({ limit: '12mb' }));

app.use('/api', buildRouter());

// JSON error handler for async route errors.
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[jobpilot-api]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Serve the built web client (single process in production).
const indexHtml = path.join(WEB_DIST, 'index.html');
if (fs.existsSync(indexHtml)) {
  app.use(express.static(WEB_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(indexHtml);
  });
}

app.listen(PORT, () => {
  console.log('');
  console.log('  JobPilot AI API listening on http://localhost:' + PORT);
  console.log('  Web UI (if built): http://localhost:' + PORT);
  console.log('  Supabase: connected | DeepSeek model: ' + (process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro'));
  console.log('');
});
