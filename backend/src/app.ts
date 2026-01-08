import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './config/env.js';
import { connectMongo } from './config/mongo.js';
import authRoutes from './routes/authRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import measurementRoutes from './routes/measurementRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { startMqttIngest } from './services/mqttIngest.js';
import { markOfflineDevices } from './services/deviceStatusService.js';
import { log } from './utils/logger.js';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/measurements', measurementRoutes);
app.use('/api/v1/alerts', alertRoutes);

app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.CORS_ORIGIN, credentials: true }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    return next();
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: string };
    socket.data.userId = payload.sub;
    socket.join(`user:${payload.sub}`);
    if (payload.role === 'admin') {
      socket.join('admins');
    }
    return next();
  } catch (error) {
    return next();
  }
});

const start = async () => {
  await connectMongo();
  log.info('Mongo connected');

  startMqttIngest(io);
  setInterval(() => {
    markOfflineDevices().catch((error) => log.error('Device status update failed', error));
  }, env.ALERT_CHECK_INTERVAL_MS);

  server.listen(env.PORT, () => {
    log.info(`API listening on ${env.PORT}`);
  });
};

start().catch((error) => {
  log.error('Failed to start server', error);
  process.exit(1);
});
