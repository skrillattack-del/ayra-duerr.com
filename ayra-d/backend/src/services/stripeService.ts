import Stripe from 'stripe';

// Lazy singleton — the server must boot fine without Stripe configured
// (billing endpoints then respond 503 and the demo tier switcher stays on).

let stripeInstance: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}

/**
 * Maps a Stripe subscription status onto our SubscriptionStatus +
 * MembershipTier pair. Pure — unit-testable.
 */
export function mapStripeStatus(status: string): {
  subscription_status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'EXPIRED';
  membership_tier: 'FREE' | 'PAID';
} {
  switch (status) {
    case 'active':
    case 'trialing':
      return { subscription_status: 'ACTIVE', membership_tier: 'PAID' };
    case 'past_due':
      // Grace period: keep access while Stripe retries payment.
      return { subscription_status: 'PAST_DUE', membership_tier: 'PAID' };
    case 'canceled':
      return { subscription_status: 'CANCELLED', membership_tier: 'FREE' };
    case 'unpaid':
    case 'incomplete_expired':
    case 'incomplete':
    case 'paused':
      return { subscription_status: 'EXPIRED', membership_tier: 'FREE' };
    default:
      return { subscription_status: 'EXPIRED', membership_tier: 'FREE' };
  }
}
