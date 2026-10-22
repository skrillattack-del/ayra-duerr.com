import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUTH_EXPIRED_EVENT,
  apiClient,
  refreshAuthSession,
  setAuthToken,
  setRefreshToken,
} from '@/lib/apiClient'
import { AuthRepository } from '@/repositories/AuthRepository'

function jsonResponse(status: number, data: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: new Headers({ 'content-type': 'application/json' }),
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  } as unknown as Response
}

describe('apiClient session refresh', () => {
  beforeEach(() => {
    localStorage.clear()
    setAuthToken('expired-access')
    setRefreshToken('refresh-one')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('refreshes once, rotates stored tokens, and retries with the new access token', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(401, { error: 'Expired access token' }))
      .mockResolvedValueOnce(jsonResponse(200, {
        accessToken: 'access-two',
        refreshToken: 'refresh-two',
      }))
      .mockResolvedValueOnce(jsonResponse(200, { channels: [{ id: 'general' }] }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiClient.get<{ channels: Array<{ id: string }> }>('/api/community/channels')

    expect(result.channels).toEqual([{ id: 'general' }])
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const refreshInit = fetchMock.mock.calls[1][1] as RequestInit
    expect(JSON.parse(String(refreshInit.body))).toEqual({ refreshToken: 'refresh-one' })

    const retryInit = fetchMock.mock.calls[2][1] as RequestInit
    expect((retryInit.headers as Headers).get('Authorization')).toBe('Bearer access-two')
    expect(localStorage.getItem('accessToken')).toBe('access-two')
    expect(localStorage.getItem('refreshToken')).toBe('refresh-two')
  })

  it('shares one refresh request across concurrent 401 responses', async () => {
    let resolveRefresh!: (response: Response) => void
    const pendingRefresh = new Promise<Response>((resolve) => {
      resolveRefresh = resolve
    })
    let refreshCalls = 0

    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/api/auth/refresh')) {
        refreshCalls += 1
        return pendingRefresh
      }

      const authorization = (init?.headers as Headers).get('Authorization')
      return authorization === 'Bearer access-two'
        ? jsonResponse(200, { ok: true })
        : jsonResponse(401, { error: 'Expired access token' })
    })
    vi.stubGlobal('fetch', fetchMock)

    const first = apiClient.get<{ ok: boolean }>('/api/community/channels')
    const second = apiClient.get<{ ok: boolean }>('/api/notifications')

    for (let turn = 0; turn < 10 && refreshCalls === 0; turn += 1) {
      await Promise.resolve()
    }
    expect(refreshCalls).toBe(1)

    resolveRefresh(jsonResponse(200, {
      accessToken: 'access-two',
      refreshToken: 'refresh-two',
    }))

    await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }])
    expect(refreshCalls).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it('replays a staggered 401 without starting a second refresh', async () => {
    let resolveLateResponse!: (response: Response) => void
    const lateResponse = new Promise<Response>((resolve) => {
      resolveLateResponse = resolve
    })
    let refreshCalls = 0

    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input)
      const authorization = init?.headers instanceof Headers
        ? init.headers.get('Authorization')
        : null

      if (url.endsWith('/api/auth/refresh')) {
        refreshCalls += 1
        return jsonResponse(200, { accessToken: 'access-two', refreshToken: 'refresh-two' })
      }
      if (url.endsWith('/api/notifications') && authorization === 'Bearer expired-access') {
        return lateResponse
      }
      if (authorization === 'Bearer access-two') {
        return jsonResponse(200, { ok: true })
      }
      return jsonResponse(401, { error: 'Expired access token' })
    })
    vi.stubGlobal('fetch', fetchMock)

    const lateRequest = apiClient.get<{ ok: boolean }>('/api/notifications')
    await expect(apiClient.get<{ ok: boolean }>('/api/community/channels')).resolves.toEqual({ ok: true })

    resolveLateResponse(jsonResponse(401, { error: 'Expired access token' }))
    await expect(lateRequest).resolves.toEqual({ ok: true })
    expect(refreshCalls).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it('does not let a delayed refresh restore a logged-out session', async () => {
    let resolveRefresh!: (response: Response) => void
    const pendingRefresh = new Promise<Response>((resolve) => {
      resolveRefresh = resolve
    })
    let refreshStarted = false

    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.endsWith('/api/auth/refresh')) {
        refreshStarted = true
        return pendingRefresh
      }
      if (url.endsWith('/api/auth/logout')) {
        return jsonResponse(200, { message: 'Logged out' })
      }
      return jsonResponse(401, { error: 'Expired access token' })
    })
    vi.stubGlobal('fetch', fetchMock)

    const protectedRequest = apiClient.get('/api/community/channels').catch((error) => error)
    for (let turn = 0; turn < 10 && !refreshStarted; turn += 1) {
      await Promise.resolve()
    }
    expect(refreshStarted).toBe(true)

    const logout = AuthRepository.logout()
    await Promise.resolve()
    resolveRefresh(jsonResponse(200, {
      accessToken: 'resurrected-access',
      refreshToken: 'resurrected-refresh',
    }))

    await logout
    await protectedRequest
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('does not start a new refresh while logout is still in flight', async () => {
    let resolveLogout!: (response: Response) => void
    const pendingLogout = new Promise<Response>((resolve) => {
      resolveLogout = resolve
    })
    let logoutStarted = false
    let refreshCalls = 0

    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.endsWith('/api/auth/logout')) {
        logoutStarted = true
        return pendingLogout
      }
      if (url.endsWith('/api/auth/refresh')) {
        refreshCalls += 1
        return jsonResponse(200, { accessToken: 'unexpected-access' })
      }
      return jsonResponse(401, { error: 'Expired access token' })
    })
    vi.stubGlobal('fetch', fetchMock)

    const logout = AuthRepository.logout()
    for (let turn = 0; turn < 10 && !logoutStarted; turn += 1) {
      await Promise.resolve()
    }
    expect(logoutStarted).toBe(true)

    await expect(apiClient.get('/api/community/channels')).rejects.toMatchObject({ status: 409 })
    expect(refreshCalls).toBe(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveLogout(jsonResponse(200, { message: 'Logged out' }))
    await logout
  })

  it('rejects a successful response that belongs to the previous session', async () => {
    let resolveOldResponse!: (response: Response) => void
    const oldResponse = new Promise<Response>((resolve) => {
      resolveOldResponse = resolve
    })

    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.endsWith('/api/auth/logout')) {
        return jsonResponse(200, { message: 'Logged out' })
      }
      return oldResponse
    })
    vi.stubGlobal('fetch', fetchMock)

    const oldRequest = apiClient.get('/api/users/me/access-mode').catch((error) => error)
    const logout = AuthRepository.logout()
    for (let turn = 0; turn < 10; turn += 1) {
      await Promise.resolve()
    }
    // Logout waits for the token-reissuing response so its cookie clear is the
    // final Set-Cookie operation.
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveOldResponse(jsonResponse(200, {
      accessToken: 'stale-access',
      refreshToken: 'stale-refresh',
    }))

    await expect(oldRequest).resolves.toMatchObject({ status: 409 })
    await logout
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('aborts a stalled token-mutation request before logout starts', async () => {
    let mutationStarted = false
    let mutationAborted = false
    let logoutStarted = false

    const fetchMock = vi.fn<typeof fetch>((input, init) => {
      const url = String(input)
      if (url.endsWith('/api/users/me/access-mode')) {
        mutationStarted = true
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            mutationAborted = true
            reject(new DOMException('The operation was aborted', 'AbortError'))
          }, { once: true })
        })
      }
      if (url.endsWith('/api/auth/logout')) {
        logoutStarted = true
        return Promise.resolve(jsonResponse(200, { message: 'Logged out' }))
      }
      return Promise.resolve(jsonResponse(500, { error: 'Unexpected request' }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const mutation = apiClient
      .patch('/api/users/me/access-mode', { mode: 'PAID' })
      .catch((error) => error)
    for (let turn = 0; turn < 10 && !mutationStarted; turn += 1) {
      await Promise.resolve()
    }
    expect(mutationStarted).toBe(true)

    const logout = AuthRepository.logout()
    await logout

    await expect(mutation).resolves.toMatchObject({ status: 0 })
    expect(mutationAborted).toBe(true)
    expect(logoutStarted).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })

  it('serializes competing logins so the latest invocation owns the final tokens', async () => {
    let resolveFirstLogin!: (response: Response) => void
    let resolveSecondLogin!: (response: Response) => void
    const firstLoginResponse = new Promise<Response>((resolve) => {
      resolveFirstLogin = resolve
    })
    const secondLoginResponse = new Promise<Response>((resolve) => {
      resolveSecondLogin = resolve
    })
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockReturnValueOnce(firstLoginResponse)
      .mockReturnValueOnce(secondLoginResponse)
    vi.stubGlobal('fetch', fetchMock)

    const firstLogin = AuthRepository.login({ email: 'first@example.com', password: 'password-one' })
    const secondLogin = AuthRepository.login({ email: 'second@example.com', password: 'password-two' })
    for (let turn = 0; turn < 10 && fetchMock.mock.calls.length < 1; turn += 1) {
      await Promise.resolve()
    }
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveFirstLogin(jsonResponse(200, {
      user: {
        id: 'user-one',
        email: 'first@example.com',
        display_name: 'First',
        created_at: '2026-07-11T00:00:00.000Z',
      },
      accessToken: 'access-one-result',
      refreshToken: 'refresh-one-result',
    }))
    await firstLogin

    for (let turn = 0; turn < 10 && fetchMock.mock.calls.length < 2; turn += 1) {
      await Promise.resolve()
    }
    expect(fetchMock).toHaveBeenCalledTimes(2)

    resolveSecondLogin(jsonResponse(200, {
      user: {
        id: 'user-two',
        email: 'second@example.com',
        display_name: 'Second',
        created_at: '2026-07-11T00:00:00.000Z',
      },
      accessToken: 'access-two-result',
      refreshToken: 'refresh-two-result',
    }))
    await secondLogin

    expect(localStorage.getItem('accessToken')).toBe('access-two-result')
    expect(localStorage.getItem('refreshToken')).toBe('refresh-two-result')
  })

  it('clears a rejected session once and does not repeat terminal refresh attempts', async () => {
    const expiredListener = vi.fn()
    window.addEventListener(AUTH_EXPIRED_EVENT, expiredListener)
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(401, { error: 'Expired access token' }))
      .mockResolvedValueOnce(jsonResponse(401, { error: 'No refresh token provided' }))
      .mockResolvedValueOnce(jsonResponse(401, { error: 'No access token provided' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiClient.get('/api/community/channels')).rejects.toMatchObject({ status: 401 })
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(expiredListener).toHaveBeenCalledTimes(1)

    await expect(apiClient.get('/api/notifications')).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(expiredListener).toHaveBeenCalledTimes(1)

    window.removeEventListener(AUTH_EXPIRED_EVENT, expiredListener)
  })

  it('preserves tokens when the refresh service has a temporary outage', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(401, { error: 'Expired access token' }))
      .mockResolvedValueOnce(jsonResponse(503, { error: 'Service unavailable' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiClient.get('/api/community/channels')).rejects.toMatchObject({ status: 503 })
    expect(localStorage.getItem('accessToken')).toBe('expired-access')
    expect(localStorage.getItem('refreshToken')).toBe('refresh-one')
  })

  it('clears a terminal latch when a new cookie-backed session cannot use localStorage', async () => {
    const rejectedFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(401, { error: 'Expired access token' }))
      .mockResolvedValueOnce(jsonResponse(401, { error: 'No refresh token provided' }))
    vi.stubGlobal('fetch', rejectedFetch)
    await expect(apiClient.get('/api/community/channels')).rejects.toMatchObject({ status: 401 })

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked')
    })
    setAuthToken('cookie-backed-access')

    const recoveredFetch = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse(200, {
      accessToken: 'cookie-backed-access-two',
      refreshToken: 'cookie-backed-refresh-two',
    }))
    vi.stubGlobal('fetch', recoveredFetch)

    await expect(refreshAuthSession()).resolves.toMatchObject({ accessToken: 'cookie-backed-access-two' })
    expect(recoveredFetch).toHaveBeenCalledTimes(1)
  })
})
