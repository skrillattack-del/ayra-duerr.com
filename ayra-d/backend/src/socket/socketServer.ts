import { Server, Socket, DefaultEventsMap } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { authService } from '../services/authService';
import { prisma } from '../db/client';
import { canReadChannel } from '../utils/entitlements';
import { corsOriginDelegate } from '../utils/corsOrigins';

export interface SocketData {
  user: {
    userId: string;
    email: string;
    role: string;
    membership_tier?: string;
  };
  displayName?: string;
}

// In-memory presence: userId -> connected socket count.
const onlineUsers = new Map<string, number>();

function broadcastPresence(io: SocketIOServer) {
  io.emit('presence:update', {
    online: onlineUsers.size,
    userIds: Array.from(onlineUsers.keys()).slice(0, 100),
  });
}

export const initSocketServer = (httpServer: HTTPServer): Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData> => {
  const io = new Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData>(httpServer, {
    cors: {
      origin: corsOriginDelegate,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['polling', 'websocket'],
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Authentication error: No token provided'));

    try {
      const decoded = authService.verifyAccessToken(token);
      socket.data.user = decoded;
      next();
    } catch (error: any) {
      return next(new Error(`Authentication error: ${error.message}`));
    }
  });

  io.on('connection', (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData>) => {
    const user = socket.data.user;
    console.log(`✅ User connected: ${user.email} (${user.userId})`);

    // Auto-join user-specific room for DMs/notifications
    socket.join(`user:${user.userId}`);

    // Auto-join global feed room (legacy alias for the default channel)
    socket.join('global');

    // Presence
    onlineUsers.set(user.userId, (onlineUsers.get(user.userId) || 0) + 1);
    broadcastPresence(io);

    // Resolve display name once for typing indicators.
    void prisma.user
      .findUnique({ where: { id: user.userId }, select: { display_name: true } })
      .then((u) => {
        if (u) socket.data.displayName = u.display_name;
      })
      .catch(() => undefined);

    // Channel rooms — tier-validated server-side against fresh DB state.
    socket.on('join:channel', async (channelId: string) => {
      try {
        if (typeof channelId !== 'string') return;
        const [channel, freshUser] = await Promise.all([
          prisma.channel.findFirst({ where: { id: channelId, is_active: true } }),
          prisma.user.findUnique({
            where: { id: user.userId },
            select: { role: true, membership_tier: true },
          }),
        ]);
        if (!channel || !freshUser) {
          return socket.emit('channel:denied', { channelId, reason: 'NOT_FOUND' });
        }
        if (channel.squad_id) {
          const membership = await prisma.squadMember.findUnique({
            where: { squad_id_user_id: { squad_id: channel.squad_id, user_id: user.userId } },
          });
          if (!membership) return socket.emit('channel:denied', { channelId, reason: 'NOT_MEMBER' });
        } else if (!canReadChannel(freshUser, channel)) {
          return socket.emit('channel:denied', { channelId, reason: 'TIER_LOCKED' });
        }
        socket.join(`channel:${channelId}`);
      } catch (error) {
        console.error('join:channel error:', error);
      }
    });

    socket.on('leave:channel', (channelId: string) => {
      if (typeof channelId === 'string') socket.leave(`channel:${channelId}`);
    });

    // Squad rooms — membership-validated.
    socket.on('join:squad', async (squadId: string) => {
      try {
        if (typeof squadId !== 'string') return;
        const membership = await prisma.squadMember.findUnique({
          where: { squad_id_user_id: { squad_id: squadId, user_id: user.userId } },
        });
        if (!membership) return socket.emit('squad:denied', { squadId });
        socket.join(`squad:${squadId}`);
      } catch (error) {
        console.error('join:squad error:', error);
      }
    });

    socket.on('leave:squad', (squadId: string) => {
      if (typeof squadId === 'string') socket.leave(`squad:${squadId}`);
    });

    // Typing indicators — volatile, room-scoped, only reaches rooms the
    // sender was allowed to join.
    socket.on('typing', (payload: { channelId?: string; squadId?: string; dmUserId?: string }) => {
      if (!payload || typeof payload !== 'object') return;
      const data = {
        userId: user.userId,
        displayName: socket.data.displayName || 'Someone',
        channelId: payload.channelId,
        squadId: payload.squadId,
      };
      if (payload.channelId && socket.rooms.has(`channel:${payload.channelId}`)) {
        socket.to(`channel:${payload.channelId}`).volatile.emit('typing', data);
      } else if (payload.squadId && socket.rooms.has(`squad:${payload.squadId}`)) {
        socket.to(`squad:${payload.squadId}`).volatile.emit('typing', data);
      } else if (payload.dmUserId && typeof payload.dmUserId === 'string') {
        socket.to(`user:${payload.dmUserId}`).volatile.emit('typing', { ...data, dmUserId: user.userId });
      }
    });

    // Challenge rooms (legacy)
    socket.on('join:challenge', (challengeId: string) => {
      socket.join(`challenge:${challengeId}`);
    });

    socket.on('leave:challenge', (challengeId: string) => {
      socket.leave(`challenge:${challengeId}`);
    });

    socket.on('disconnect', (reason) => {
      const remaining = (onlineUsers.get(user.userId) || 1) - 1;
      if (remaining <= 0) {
        onlineUsers.delete(user.userId);
      } else {
        onlineUsers.set(user.userId, remaining);
      }
      broadcastPresence(io);
      console.log(`❌ User disconnected: ${user.email} - ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`Socket error for user ${user.email}:`, error);
    });
  });

  return io;
};

let ioInstance: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData> | null = null;

export const setIO = (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData>) => {
  ioInstance = io;
};

export const getIO = (): Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData> => {
  if (!ioInstance) throw new Error('Socket.io server not initialized. Call setIO() first.');
  return ioInstance;
};

export type SocketIOServer = Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData>;
export let io: SocketIOServer;

