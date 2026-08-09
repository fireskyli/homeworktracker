import express from 'express';
import path from 'path';
import { DEPLOYMENT_MODE, FEATURES } from './config';
import { createAuthMiddleware } from './middleware/auth';
import { taskRouter } from './routes/tasks';
import { checkinRouter } from './routes/checkins';
import { statsRouter } from './routes/stats';
import { uploadRouter } from './routes/upload';
import { settingsRouter } from './routes/settings';
import { backupRouter } from './routes/backup';
import { redemptionsRouter } from './routes/redemptions';
import { productsRouter } from './routes/products';
import { exerciseTypeRouter } from './routes/exercise-types';
import { exerciseRouter } from './routes/exercises';
import { exerciseStatsRouter } from './routes/exercise-stats';
import { authRouter } from './routes/auth';
import { scheduleRouter } from './routes/schedules';
import { pushConfigRouter } from './routes/schedule-push-config';
import { scheduleAttendanceRouter } from './routes/schedule-attendance';

const app = express();

// -- Middleware --
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -- --
app.use(createAuthMiddleware());

// -- Static files --
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// -- API Routes --
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/tasks', taskRouter);
app.use('/api/checkins', checkinRouter);
app.use('/api/stats', statsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/backup', backupRouter);
app.use('/api/redemptions', redemptionsRouter);
app.use('/api/products', productsRouter);
app.use('/api/exercise-types', exerciseTypeRouter);
app.use('/api/exercises', exerciseRouter);
app.use('/api/exercise-stats', exerciseStatsRouter);
app.use('/api/auth', authRouter);
app.use('/api/schedules', scheduleAttendanceRouter);
app.use('/api/schedules', scheduleRouter);
app.use('/api/schedule-push-config', pushConfigRouter);

// -- --
app.get('/api/config', (_req, res) => {
  res.json({ mode: DEPLOYMENT_MODE, features: FEATURES });
});

// -- Production: serve built frontend --
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
  });
}

export default app;
