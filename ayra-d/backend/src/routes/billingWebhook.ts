import { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../db/client';
import { getStripe, mapStripeStatus } from '../services/stripeService';
import { notify } from '../services/notificationService';
import { getIO } from '../socket/socketServer';

// Mounted in server.ts with express.raw({ type: 'application/json' }) BEFORE
// the global express.json() — Stripe signature verification needs the raw body.

async function resolveUserId(event: {
  customerId?: string | null;
  clientReferenceId?: string | null;
  metadataUserId?: string | null;
}): Promise<string | null> {
  if (event.customerId) {
    const user = await prisma.user.findUnique({
      where: { stripe_customer_id: event.customerId },
      select: { id: true },
    });
    if (user) return user.id;
  }
  return event.clientReferenceId || event.metadataUserId || null;
}

async function applyTierChange(
  userId: string,
  data: {
    membership_tier: 'FREE' | 'PAID';
    subscription_status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'EXPIRED';
    stripe_subscription_id?: string | null;
    stripe_price_id?: string | null;
    current_period_end?: Date | null;
    cancel_at_period_end?: boolean;
  },
): Promise<void> {
  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { membership_tier: true },
  });
  if (!before) return;

  await prisma.user.update({ where: { id: userId }, data });

  if (before.membership_tier !== data.membership_tier) {
    try {
      getIO().to(`user:${userId}`).emit('entitlements:changed', {
        membership_tier: data.membership_tier,
        subscription_status: data.subscription_status,
      });
    } catch { /* socket not up */ }

    if (data.membership_tier === 'PAID') {
      void notify(userId, {
        type: 'ANNOUNCEMENT',
        title: 'Welcome to PRO 👑',
        body: 'Your upgrade is live — pro-lounge, squad creation, and bigger uploads are unlocked.',
        link: '/dashboard/community',
      });
    } else {
      void notify(userId, {
        type: 'ANNOUNCEMENT',
        title: 'Your PRO membership has ended',
        body: 'You are back on the free plan. You can resubscribe any time from Settings.',
        link: '/dashboard/settings#membership-plan',
      });
    }
  }
}

export async function stripeWebhookHandler(req: Request, res: Response) {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return res.status(400).json({ error: 'Webhook not configured' });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error: any) {
    console.warn('Stripe webhook signature verification failed:', error.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = await resolveUserId({
          customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          clientReferenceId: session.client_reference_id,
        });
        if (userId) {
          await applyTierChange(userId, {
            membership_tier: 'PAID',
            subscription_status: 'ACTIVE',
            stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId({
          customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
          metadataUserId: sub.metadata?.userId,
        });
        if (userId) {
          const mapped = mapStripeStatus(sub.status);
          const periodEnd = (sub as any).current_period_end ?? sub.items?.data?.[0]?.current_period_end;
          await applyTierChange(userId, {
            ...mapped,
            stripe_subscription_id: sub.id,
            stripe_price_id: sub.items?.data?.[0]?.price?.id ?? null,
            current_period_end: periodEnd ? new Date(periodEnd * 1000) : null,
            cancel_at_period_end: !!sub.cancel_at_period_end,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId({
          customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
          metadataUserId: sub.metadata?.userId,
        });
        if (userId) {
          await applyTierChange(userId, {
            membership_tier: 'FREE',
            subscription_status: 'CANCELLED',
            stripe_subscription_id: null,
            stripe_price_id: null,
            current_period_end: null,
            cancel_at_period_end: false,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = await resolveUserId({
          customerId: typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as any)?.id,
        });
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { subscription_status: 'PAST_DUE' },
          });
          void notify(userId, {
            type: 'ANNOUNCEMENT',
            title: 'Payment failed',
            body: 'We could not process your PRO renewal. Update your payment method to keep your benefits.',
            link: '/dashboard/settings#membership-plan',
          });
        }
        break;
      }

      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break;
    }

    console.log(`💳 Stripe webhook handled: ${event.type} (${event.id})`);
    res.json({ received: true });
  } catch (error) {
    console.error(`Stripe webhook processing error (${event.type}):`, error);
    // 500 → Stripe retries, which is what we want for transient DB failures.
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
