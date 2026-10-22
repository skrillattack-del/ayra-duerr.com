import { describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'http';

// Importing the real router pulls in the prisma singleton via userRepository,
// but POST /logout runs no queries, so no database is needed.
import authRoutes from '../routes/authRoutes';

async function startApp(): Promise<{ server: Server; baseUrl: string }> {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Could not determine test server address');
  }
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function requestLogout(): Promise<string[]> {
  const { server, baseUrl } = await startApp();
  try {
    const res = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
    expect(res.status).toBe(200);
    const headers = res.headers as Headers & { getSetCookie?: () => string[] };
    if (typeof headers.getSetCookie === 'function') {
      return headers.getSetCookie();
    }
    // Fallback for older undici: split combined header on cookie boundaries
    // (safe here: the Expires date commas are never followed by `token=`).
    return (headers.get('set-cookie') ?? '').split(/,(?=\s*[A-Za-z]+=)/).filter(Boolean);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function withNodeEnv<T>(value: string, run: () => Promise<T>): Promise<T> {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = value;
  try {
    return await run();
  } finally {
    process.env.NODE_ENV = previous;
  }
}

describe('POST /api/auth/logout', () => {
  it('expires both auth cookies with SameSite=None; Secure in production', async () => {
    const cookies = await withNodeEnv('production', requestLogout);

    const access = cookies.find((c) => c.startsWith('accessToken='));
    const refresh = cookies.find((c) => c.startsWith('refreshToken='));
    expect(access).toBeDefined();
    expect(refresh).toBeDefined();

    for (const cookie of [access, refresh] as string[]) {
      // Expired in the past, and with the exact attributes the login
      // Set-Cookie uses so cross-site browsers accept the deletion.
      expect(cookie).toContain('Expires=Thu, 01 Jan 1970');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie.toLowerCase()).toContain('samesite=none');
      expect(cookie).toContain('Path=/');
      expect(cookie.toLowerCase()).not.toContain('domain=');
    }
  });

  it('clears cookies with lax, non-secure attributes outside production', async () => {
    const cookies = await withNodeEnv('development', requestLogout);

    const access = cookies.find((c) => c.startsWith('accessToken='));
    expect(access).toBeDefined();
    expect(access).toContain('Expires=Thu, 01 Jan 1970');
    expect(access).toContain('HttpOnly');
    expect(access).not.toContain('Secure');
    expect(access!.toLowerCase()).toContain('samesite=lax');
    expect(access).toContain('Path=/');
    expect(access!.toLowerCase()).not.toContain('domain=');
  });
});
