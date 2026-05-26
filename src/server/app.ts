import express from 'express';
import path from 'path';
import { taskRouter } from './routes/tasks';
import { checkinRouter } from './routes/checkins';
import { statsRouter } from './routes/stats';
import { uploadRouter } from './routes/upload';
import { settingsRouter } from './routes/settings';
import { backupRouter } from './routes/backup';

const app = express();

// ── Middleware ──────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static files ──────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// ── API Routes ────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/tasks', taskRouter);
app.use('/api/checkins', checkinRouter);
app.use('/api/stats', statsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/backup', backupRouter);

// ── Production: serve built frontend ──────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
  });
}

export default app;
