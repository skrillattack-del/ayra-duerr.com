import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';

vi.mock('../repositories/siteSettingRepository', () => ({
  siteSettingRepository: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

import { siteSettingRepository } from '../repositories/siteSettingRepository';
import { authService } from '../services/authService';
import adminRoutes from '../routes/adminRoutes';
import siteRoutes from '../routes/siteRoutes';

const SUPPORTED_THEMES = ['cyberpunk', 'retro', 'lava', 'mana', 'mythic'] as const;
const getSetting = vi.mocked(siteSettingRepository.get);
const setSetting = vi.mocked(siteSettingRepository.set);

interface TestResponse {
  status: number;
  body: any;
}

async function request(
  method: 'GET' | 'PUT',
  path: string,
  options: { body?: unknown; token?: string } = {},
): Promise<TestResponse> {
  const app = express();
  app.use(express.json());
  app.use('/api/site', siteRoutes);
  app.use('/api/admin', adminRoutes);

  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  try {
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Could not determine test server address');
    }

    const headers: Record<string, string> = {};
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.token) headers.Authorization = `Bearer ${options.token}`;

    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    return {
      status: response.status,
      body: await response.json(),
    };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function accessToken(role: 'ADMIN' | 'CLIENT'): string {
  return authService.generateAccessToken({
    userId: role === 'ADMIN' ? 'admin-user-id' : 'client-user-id',
    email: `${role.toLowerCase()}@example.com`,
    role,
    membership_tier: 'FREE',
  });
}

describe('site theme routes', () => {
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'site-theme-route-test-secret';
  });

  afterAll(() => {
    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getSetting.mockResolvedValue(null);
    setSetting.mockResolvedValue(undefined);
  });

  describe('GET /api/site/theme', () => {
    it('returns cyberpunk when the setting is absent or stale', async () => {
      const unset = await request('GET', '/api/site/theme');
      expect(unset).toEqual({ status: 200, body: { data: { theme: 'cyberpunk' } } });

      getSetting.mockResolvedValueOnce('arena');
      const stale = await request('GET', '/api/site/theme');
      expect(stale).toEqual({ status: 200, body: { data: { theme: 'cyberpunk' } } });
    });

    it.each(SUPPORTED_THEMES)('returns the persisted %s theme', async (theme) => {
      getSetting.mockResolvedValue(theme);

      const response = await request('GET', '/api/site/theme');

      expect(response).toEqual({ status: 200, body: { data: { theme } } });
      expect(getSetting).toHaveBeenCalledWith('site_theme');
    });

    it('falls back safely when persistence is unavailable', async () => {
      getSetting.mockRejectedValueOnce(new Error('database unavailable'));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      try {
        const response = await request('GET', '/api/site/theme');
        expect(response).toEqual({ status: 200, body: { data: { theme: 'cyberpunk' } } });
      } finally {
        consoleError.mockRestore();
      }
    });
  });

  describe('PUT /api/admin/site/theme', () => {
    it('requires authentication and the ADMIN role', async () => {
      const unauthenticated = await request('PUT', '/api/admin/site/theme', {
        body: { theme: 'retro' },
      });
      expect(unauthenticated.status).toBe(401);

      const forbidden = await request('PUT', '/api/admin/site/theme', {
        body: { theme: 'retro' },
        token: accessToken('CLIENT'),
      });
      expect(forbidden.status).toBe(403);
      expect(setSetting).not.toHaveBeenCalled();
    });

    it.each(SUPPORTED_THEMES)('persists the supported %s theme', async (theme) => {
      const response = await request('PUT', '/api/admin/site/theme', {
        body: { theme },
        token: accessToken('ADMIN'),
      });

      expect(response).toEqual({ status: 200, body: { data: { theme } } });
      expect(setSetting).toHaveBeenCalledWith('site_theme', theme, 'admin-user-id');
    });

    it('rejects themes outside the five-id contract', async () => {
      const response = await request('PUT', '/api/admin/site/theme', {
        body: { theme: 'arena' },
        token: accessToken('ADMIN'),
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
      expect(setSetting).not.toHaveBeenCalled();
    });
  });
});
