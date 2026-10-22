import { describe, expect, it } from 'vitest';
import { isCorsOriginAllowed, resolveAllowedCorsOrigins } from '../utils/corsOrigins';

describe('resolveAllowedCorsOrigins', () => {
  it('keeps the production and local frontend origins available', () => {
    const origins = resolveAllowedCorsOrigins({});

    expect(origins.has('https://www.gongafitness.com')).toBe(true);
    expect(origins.has('http://localhost:3000')).toBe(true);
  });

  it('adds comma-separated configured origins and normalizes trailing paths', () => {
    const origins = resolveAllowedCorsOrigins({
      CORS_ORIGIN: 'https://preview.example.com/, https://app.example.com/path',
      FRONTEND_URL: 'https://customer.example.com',
    });

    expect(origins.has('https://preview.example.com')).toBe(true);
    expect(origins.has('https://app.example.com')).toBe(true);
    expect(origins.has('https://customer.example.com')).toBe(true);
  });

  it('does not treat a wildcard as a credentialed origin', () => {
    const origins = resolveAllowedCorsOrigins({ CORS_ORIGIN: '*' });
    expect(origins.has('*')).toBe(false);
  });

  it('does not trust localhost by default in production', () => {
    const origins = resolveAllowedCorsOrigins({ NODE_ENV: 'production' });
    expect(origins.has('http://localhost:3000')).toBe(false);
  });

  it('allows canonical/no-origin clients and rejects an arbitrary website', () => {
    expect(isCorsOriginAllowed('https://www.gongafitness.com')).toBe(true);
    expect(isCorsOriginAllowed(undefined)).toBe(true);
    expect(isCorsOriginAllowed('https://attacker.example')).toBe(false);
  });
});
