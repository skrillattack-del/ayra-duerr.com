import { describe, expect, it } from 'vitest';
import { refreshTokenCandidates, verifyRefreshTokenCandidates } from '../utils/authTokens';

describe('refreshTokenCandidates', () => {
  it('tries the explicit body token before the cookie token', () => {
    expect(refreshTokenCandidates('body-token', 'cookie-token')).toEqual(['body-token', 'cookie-token']);
  });

  it('falls back to the cookie for clients without a body token', () => {
    expect(refreshTokenCandidates(undefined, 'cookie-token')).toEqual(['cookie-token']);
    expect(refreshTokenCandidates('', 'cookie-token')).toEqual(['cookie-token']);
  });

  it('deduplicates identical tokens and rejects non-string credentials', () => {
    expect(refreshTokenCandidates('same-token', 'same-token')).toEqual(['same-token']);
    expect(refreshTokenCandidates(undefined, undefined)).toEqual([]);
    expect(refreshTokenCandidates(123, null)).toEqual([]);
  });

  it('falls back when the preferred source is stale', () => {
    const verify = (token: string) => {
      if (token === 'stale-body-token') throw new Error('expired');
      return { userId: 'user-from-cookie' };
    };

    expect(
      verifyRefreshTokenCandidates(['stale-body-token', 'valid-cookie-token'], verify),
    ).toEqual({ userId: 'user-from-cookie' });
  });
});
