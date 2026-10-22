import { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import authRoutes from './authRoutes';
import challengeRoutes from './challengeRoutes';
import progressRoutes from './progressRoutes';
import adminRoutes from './adminRoutes';
import liftRoutes from './liftRoutes';
import messageRoutes from './messageRoutes';
import userRoutes from './userRoutes';
import workoutRoutes from './workoutRoutes';
import programRoutes from './programRoutes';
import nutritionRoutes from './nutritionRoutes';
import channelRoutes from './channelRoutes';
import communityRoutes from './communityRoutes';
import friendRoutes from './friendRoutes';
import notificationRoutes from './notificationRoutes';
import billingRoutes from './billingRoutes';
import siteRoutes from './siteRoutes';
import bodyMetricsRoutes from './bodyMetricsRoutes';
import { storageService, isStorageConfigured } from '../services/storageService';

export const initRoutes = (app: Express) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/challenges', challengeRoutes);
  app.use('/api/progress', progressRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/lifts', liftRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/workouts', workoutRoutes);
  app.use('/api/programs', programRoutes);
  app.use('/api/nutrition', nutritionRoutes);
  app.use('/api/community', communityRoutes);
  app.use('/api/friends', friendRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/site', siteRoutes);
  app.use('/api/body-metrics', bodyMetricsRoutes);
  app.use('/api/messages/squads/:squadId/channels', channelRoutes);

  app.get('/api/media/*', async (req, res) => {
    const key = req.path.slice('/api/media/'.length);
    if (!key) return res.status(400).json({ error: 'Missing key' });
    
    // Serve from local disk when S3 isn't configured
    if (!isStorageConfigured) {
      const LOCAL_STORAGE_DIR = process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), 'uploads');
      const filePath = path.join(LOCAL_STORAGE_DIR, key);
      
      // Security: prevent path traversal
      if (!filePath.startsWith(LOCAL_STORAGE_DIR)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      const stat = fs.statSync(filePath);
      const ext = path.extname(key).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
      };
      
      res.set('Cache-Control', 'private, max-age=3600');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      res.set('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.set('Content-Length', String(stat.size));
      fs.createReadStream(filePath).pipe(res);
      return;
    }
    
    try {
      const { stream, contentType, contentLength } = await storageService.getObjectStream(key);
      res.set('Cache-Control', 'private, max-age=3600');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      if (contentType) res.set('Content-Type', contentType);
      if (contentLength) res.set('Content-Length', String(contentLength));
      stream.pipe(res);
    } catch {
      res.status(404).json({ error: 'File not found' });
    }
  });
};
