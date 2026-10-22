import { describe, it, expect } from 'vitest';
import { ENTITLEMENTS, effectiveTier, canReadChannel, canPostChannel } from '../utils/entitlements';

// These literals must stay in sync with src/lib/entitlements.ts on the
// frontend — its test asserts the identical values.
describe('entitlements matrix', () => {
  it('FREE tier limits', () => {
    expect(ENTITLEMENTS.FREE.maxUploadBytes).toBe(2 * 1024 * 1024);
    expect(ENTITLEMENTS.FREE.maxMediaPerMessage).toBe(2);
    expect(ENTITLEMENTS.FREE.uploadsPer5Min).toBe(5);
    expect(ENTITLEMENTS.FREE.maxSquadsJoined).toBe(2);
    expect(ENTITLEMENTS.FREE.maxSquadsOwned).toBe(0);
    expect(ENTITLEMENTS.FREE.canCreateSquads).toBe(false);
    expect(ENTITLEMENTS.FREE.canAccessPaidChannels).toBe(false);
  });

  it('PAID tier limits', () => {
    expect(ENTITLEMENTS.PAID.maxUploadBytes).toBe(10 * 1024 * 1024);
    expect(ENTITLEMENTS.PAID.maxMediaPerMessage).toBe(6);
    expect(ENTITLEMENTS.PAID.uploadsPer5Min).toBe(10);
    expect(ENTITLEMENTS.PAID.maxSquadsJoined).toBe(10);
    expect(ENTITLEMENTS.PAID.maxSquadsOwned).toBe(3);
    expect(ENTITLEMENTS.PAID.canCreateSquads).toBe(true);
    expect(ENTITLEMENTS.PAID.canAccessPaidChannels).toBe(true);
  });

  it('ADMIN tier limits', () => {
    expect(ENTITLEMENTS.ADMIN.maxUploadBytes).toBe(25 * 1024 * 1024);
    expect(ENTITLEMENTS.ADMIN.maxMediaPerMessage).toBe(10);
    expect(ENTITLEMENTS.ADMIN.uploadsPer5Min).toBe(30);
  });

  it('resolves effective tier from role + membership', () => {
    expect(effectiveTier({ role: 'ADMIN', membership_tier: 'FREE' })).toBe('ADMIN');
    expect(effectiveTier({ role: 'TRAINER', membership_tier: 'FREE' })).toBe('PAID');
    expect(effectiveTier({ role: 'CLIENT', membership_tier: 'PAID' })).toBe('PAID');
    expect(effectiveTier({ role: 'CLIENT', membership_tier: 'FREE' })).toBe('FREE');
  });

  it('channel read gating', () => {
    const free = { role: 'CLIENT', membership_tier: 'FREE' };
    const paid = { role: 'CLIENT', membership_tier: 'PAID' };
    expect(canReadChannel(free, { required_tier: 'FREE' })).toBe(true);
    expect(canReadChannel(free, { required_tier: 'PAID' })).toBe(false);
    expect(canReadChannel(paid, { required_tier: 'PAID' })).toBe(true);
  });

  it('channel post gating honours ADMIN_ONLY', () => {
    const free = { role: 'CLIENT', membership_tier: 'FREE' };
    const admin = { role: 'ADMIN', membership_tier: 'FREE' };
    const announcements = { required_tier: 'FREE', posting_policy: 'ADMIN_ONLY' };
    expect(canPostChannel(free, announcements)).toBe(false);
    expect(canPostChannel(admin, announcements)).toBe(true);
    expect(canPostChannel(free, { required_tier: 'FREE', posting_policy: 'EVERYONE' })).toBe(true);
    expect(canPostChannel(free, { required_tier: 'PAID', posting_policy: 'EVERYONE' })).toBe(false);
  });
});
