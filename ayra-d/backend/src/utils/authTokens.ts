function usableToken(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * The explicit body credential represents the browser's current JS session,
 * while the cookie keeps same-site and older clients compatible. Return both
 * distinct candidates so one stale source cannot shadow the other.
 */
export function refreshTokenCandidates(bodyToken: unknown, cookieToken: unknown): string[] {
  const candidates = [usableToken(bodyToken), usableToken(cookieToken)].filter(
    (token): token is string => !!token,
  );
  return Array.from(new Set(candidates));
}

export function verifyRefreshTokenCandidates<T>(
  candidates: string[],
  verify: (token: string) => T,
): T {
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return verify(candidate);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Invalid refresh token');
}
