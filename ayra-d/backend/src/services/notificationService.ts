import { prisma } from '../db/client';
import { getIO } from '../socket/socketServer';

export type NotificationTypeName =
  | 'REPLY'
  | 'MENTION'
  | 'SQUAD_INVITE'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'DIRECT_MESSAGE'
  | 'ACHIEVEMENT'
  | 'LEVEL_UP'
  | 'ANNOUNCEMENT'
  | 'MODERATION';

export interface NotifyInput {
  type: NotificationTypeName;
  actorId?: string;
  title: string;
  body?: string;
  link?: string;
  refId?: string;
}

/**
 * Creates a notification row and pushes it to the recipient's socket room.
 * Self-notifications are silently skipped. Never throws — notification
 * failures must not break the primary action.
 */
export async function notify(userId: string, input: NotifyInput): Promise<void> {
  if (input.actorId && input.actorId === userId) return;
  try {
    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        actor_id: input.actorId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
        ref_id: input.refId,
      },
      include: {
        actor: {
          select: { id: true, display_name: true, avatar_url: true },
        },
      },
    });

    try {
      getIO().to(`user:${userId}`).emit('notification:new', notification);
    } catch {
      // socket server not initialized (tests) — row still created
    }
  } catch (error) {
    console.error('notify error:', error);
  }
}
