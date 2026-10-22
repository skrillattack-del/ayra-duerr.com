import prisma from '../db/client';

export interface CreateChannelDTO {
  squad_id: string;
  name: string;
  description?: string;
  channel_type?: string;
  created_by: string;
}

export interface CreateChannelMessageDTO {
  content: string;
  sender_id: string;
  channel_id: string;
  media_urls?: string[];
  parent_id?: string;
}

const channelSelect = {
  id: true,
  squad_id: true,
  name: true,
  description: true,
  channel_type: true,
  created_by: true,
  is_active: true,
  created_at: true,
  updated_at: true,
} as const;

const messageSelect = {
  id: true,
  content: true,
  sender_id: true,
  channel_id: true,
  media_urls: true,
  parent_id: true,
  is_edited: true,
  is_deleted: true,
  created_at: true,
  sender: {
    select: { id: true, display_name: true, avatar_url: true, role: true },
  },
  reactions: {
    select: { id: true, emoji: true, user_id: true },
  },
  _count: { select: { replies: true } },
} as const;

export const channelRepository = {
  async listChannels(squadId: string) {
    return prisma.channel.findMany({
      where: { squad_id: squadId, is_active: true },
      select: channelSelect,
      orderBy: { created_at: 'asc' },
    });
  },

  async findChannelById(id: string) {
    return prisma.channel.findUnique({
      where: { id },
      select: channelSelect,
    });
  },

  async createChannel(data: CreateChannelDTO) {
    return prisma.channel.create({
      data: {
        squad_id: data.squad_id,
        name: data.name,
        description: data.description,
        channel_type: (data.channel_type || 'TEXT') as any,
        created_by: data.created_by,
      },
      select: channelSelect,
    });
  },

  async updateChannel(id: string, data: { name?: string; description?: string; is_active?: boolean }) {
    return prisma.channel.update({
      where: { id },
      data,
      select: channelSelect,
    });
  },

  async deleteChannel(id: string) {
    return prisma.channel.update({
      where: { id },
      data: { is_active: false },
      select: channelSelect,
    });
  },

  async listMessages(channelId: string, limit = 50, before?: string) {
    return prisma.message.findMany({
      where: {
        channel_id: channelId,
        parent_id: null,
        is_deleted: false,
        ...(before ? { id: { lt: before } } : {}),
      },
      select: messageSelect,
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  },

  async createMessage(data: CreateChannelMessageDTO) {
    return prisma.message.create({
      data: {
        content: data.content,
        sender_id: data.sender_id,
        channel_id: data.channel_id,
        channel_type: 'TEXT',
        media_urls: data.media_urls || [],
        parent_id: data.parent_id,
      },
      select: messageSelect,
    });
  },

  async addReaction(messageId: string, userId: string, emoji: string) {
    return prisma.messageReaction.upsert({
      where: { message_id_user_id_emoji: { message_id: messageId, user_id: userId, emoji } },
      create: { message_id: messageId, user_id: userId, emoji },
      update: {},
    });
  },

  async removeReaction(messageId: string, userId: string, emoji: string) {
    return prisma.messageReaction.deleteMany({
      where: { message_id: messageId, user_id: userId, emoji },
    });
  },
};
