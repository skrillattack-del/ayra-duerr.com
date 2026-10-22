import { describe, it, expect } from 'vitest';
import { mapStripeStatus } from '../services/stripeService';

describe('mapStripeStatus', () => {
  it('active/trialing keep PAID + ACTIVE', () => {
    expect(mapStripeStatus('active')).toEqual({ subscription_status: 'ACTIVE', membership_tier: 'PAID' });
    expect(mapStripeStatus('trialing')).toEqual({ subscription_status: 'ACTIVE', membership_tier: 'PAID' });
  });

  it('past_due keeps access during the grace period', () => {
    expect(mapStripeStatus('past_due')).toEqual({ subscription_status: 'PAST_DUE', membership_tier: 'PAID' });
  });

  it('terminal states downgrade to FREE', () => {
    expect(mapStripeStatus('canceled').membership_tier).toBe('FREE');
    expect(mapStripeStatus('unpaid').membership_tier).toBe('FREE');
    expect(mapStripeStatus('incomplete_expired').membership_tier).toBe('FREE');
    expect(mapStripeStatus('something_unknown').membership_tier).toBe('FREE');
  });
});
