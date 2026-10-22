// Shared message query fragments and response transforms used by the global
// feed, channel feeds, squad feeds, and thread endpoints.

export const senderSelect = {
  id: true,
  display_name: true,
  avatar_url: true,
  role: true,
  membership_tier: true,
  stats: { select: { level: true } },
} as const;

export interface ReactionSummaryEntry {
  count: number;
  hasReacted: boolean;
}

/**
 * Collapses raw reaction rows into { emoji: { count, hasReacted } } keyed by
 * emoji, from the viewpoint of `viewerId`, and strips the raw rows.
 */
export function withReactionSummary<T extends { reactions: Array<{ emoji: string; user_id: string }> }>(
  message: T,
  viewerId: string,
): Omit<T, 'reactions'> & { reactions: never[]; reactionSummary: Record<string, ReactionSummaryEntry> } {
  const reactionSummary: Record<string, ReactionSummaryEntry> = {};
  for (const r of message.reactions) {
    if (!reactionSummary[r.emoji]) {
      reactionSummary[r.emoji] = { count: 0, hasReacted: false };
    }
    reactionSummary[r.emoji].count++;
    if (r.user_id === viewerId) {
      reactionSummary[r.emoji].hasReacted = true;
    }
  }
  const { reactions, ...rest } = message;
  return { ...rest, reactions: [], reactionSummary };
}
