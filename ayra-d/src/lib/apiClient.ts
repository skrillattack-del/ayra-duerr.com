/**
 * API Client - Replaces Supabase client
 * Handles HTTP requests to the backend API with JWT authentication
 */

let API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
if (API_URL && !API_URL.startsWith('http') && !API_URL.startsWith('/')) {
  API_URL = `https://${API_URL}`;
}
// Strip trailing slashes for consistent concatenation
API_URL = API_URL.replace(/\/+$/, '');

/** Resolved backend origin with protocol, for use by other modules (e.g. XHR uploads). */
export { API_URL };

export interface ApiError {
  error: string;
  details?: any;
  message?: string;
  status?: number;
  meta?: any;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export const AUTH_EXPIRED_EVENT = 'auth:expired';
export const AUTH_TOKEN_UPDATED_EVENT = 'auth:token-updated';

/**
 * Get access token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('accessToken');
  } catch {
    return null;
  }
}

/**
 * Get refresh token from localStorage (cross-origin fallback when httpOnly cookie isn't sent)
 */
function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('refreshToken');
  } catch {
    return null;
  }
}

let terminalRefreshError: ApiError | null = null;
let authExpiredDispatched = false;
let sessionEpoch = 0;
let accessTokenVersion = 0;
let refreshPromise: Promise<AuthTokens> | null = null;
let refreshAbortController: AbortController | null = null;
let authTransitionTail: Promise<void> = Promise.resolve();
let authTransitionsPending = 0;
const inFlightTokenMutationResponses = new Map<Promise<void>, AbortController>();

const TOKEN_MUTATING_ENDPOINTS = new Set([
  '/api/users/me/plan',
  '/api/users/me/access-mode',
  '/api/users/me/redeem-code',
]);

/**
 * Set auth tokens in localStorage
 */
export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;

  accessTokenVersion += 1;
  if (token) {
    // Reset terminal state even when browser storage is unavailable. A
    // cookie-backed login/refresh still begins a valid new token generation.
    terminalRefreshError = null;
    authExpiredDispatched = false;
  }

  try {
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }

  if (token) window.dispatchEvent(new Event(AUTH_TOKEN_UPDATED_EVENT));
}

/**
 * Set refresh token in localStorage (cross-origin fallback)
 */
export function setRefreshToken(token: string | null): void {
  if (typeof window === 'undefined') return;

  if (token) {
    terminalRefreshError = null;
    authExpiredDispatched = false;
  }

  try {
    if (token) {
      localStorage.setItem('refreshToken', token);
    } else {
      localStorage.removeItem('refreshToken');
    }
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}

function removeStoredAuthTokens(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}

export function clearAuthTokens(): void {
  sessionEpoch += 1;
  accessTokenVersion += 1;
  removeStoredAuthTokens();
}

/**
 * Invalidate any in-flight refresh before an explicit login/register/logout.
 * Waiting for the old request makes the new auth operation the final cookie
 * writer even when the browser cannot cancel a response already in flight.
 */
export async function beginAuthTransition(): Promise<() => void> {
  authTransitionsPending += 1;
  let releaseQueue!: () => void;
  const queueSlot = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });
  const previousTransition = authTransitionTail;
  authTransitionTail = previousTransition.catch(() => undefined).then(() => queueSlot);
  await previousTransition.catch(() => undefined);

  sessionEpoch += 1;
  accessTokenVersion += 1;
  terminalRefreshError = null;
  authExpiredDispatched = false;

  const pendingRefresh = refreshPromise;
  refreshAbortController?.abort();
  removeStoredAuthTokens();
  const pendingTokenMutations = Array.from(inFlightTokenMutationResponses.entries());
  for (const [, controller] of pendingTokenMutations) controller.abort();
  await Promise.all([
    pendingRefresh?.catch(() => undefined),
    Promise.all(pendingTokenMutations.map(([response]) => response)),
  ]);

  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    authTransitionsPending = Math.max(0, authTransitionsPending - 1);
    releaseQueue();
  };
}

function expireAuthSession(error: ApiError): void {
  clearAuthTokens();
  terminalRefreshError = error;

  if (typeof window !== 'undefined' && !authExpiredDispatched) {
    authExpiredDispatched = true;
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}

/**
 * Attempt to refresh the access token.
 * Sends the refresh token in the request body as a cross-origin fallback
 * (httpOnly cookies may be blocked by third-party cookie policies).
 */
async function performTokenRefresh(): Promise<AuthTokens> {
  if (terminalRefreshError) throw terminalRefreshError;

  const refreshSessionEpoch = sessionEpoch;
  const controller = new AbortController();
  refreshAbortController = controller;

  try {
    const refreshToken = getRefreshToken();
    const body: { refreshToken?: string } = {};
    if (refreshToken) body.refreshToken = refreshToken;

    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    let data: any = {};
    try {
      data = await response.json();
    } catch {
      // The status still determines whether this is a terminal auth failure.
    }

    if (refreshSessionEpoch !== sessionEpoch) {
      throw {
        error: 'Auth session changed',
        message: 'A newer login or logout replaced this refresh request',
        status: 409,
      } satisfies ApiError;
    }

    if (!response.ok || !data?.accessToken) {
      const error: ApiError = {
        error: data?.error || 'Failed to refresh session',
        message: data?.message,
        status: response.status,
        meta: data,
      };
      if (response.status === 401 || response.status === 403) {
        expireAuthSession(error);
      }
      throw error;
    }

    setAuthToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  } catch (error: any) {
    if (typeof error?.status === 'number') throw error;
    throw {
      error: 'Network error',
      message: error?.message || 'Failed to refresh session',
      status: 0,
    } satisfies ApiError;
  } finally {
    if (refreshAbortController === controller) {
      refreshAbortController = null;
    }
  }
}

/**
 * Refresh the browser session through one shared in-flight request.
 * Direct refresh callers and automatic 401 retries both use this path.
 */
export function refreshAuthSession(): Promise<AuthTokens> {
  if (authTransitionsPending > 0) {
    return Promise.reject({
      error: 'Auth transition in progress',
      message: 'Login or logout is already updating the browser session',
      status: 409,
    } satisfies ApiError);
  }
  if (terminalRefreshError) return Promise.reject(terminalRefreshError);
  if (!refreshPromise) {
    refreshPromise = performTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

const AUTH_BOOTSTRAP_ENDPOINTS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout'];

/**
 * Make HTTP request with authentication
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const requestSessionEpoch = sessionEpoch;
  const requestTokenVersion = accessTokenVersion;
  const token = getAuthToken();
  const url = `${API_URL}${endpoint}`;
  const isAuthBootstrapEndpoint = AUTH_BOOTSTRAP_ENDPOINTS.includes(endpoint);

  if (authTransitionsPending > 0 && !isAuthBootstrapEndpoint) {
    throw {
      error: 'Auth transition in progress',
      message: 'Login or logout is already updating the browser session',
      status: 409,
    } satisfies ApiError;
  }

  const headers = new Headers(options.headers);
  const isFormData = typeof window !== 'undefined' && options.body instanceof FormData;
  // Let the browser set the multipart boundary for FormData uploads.
  if (!isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    const isTokenMutation = TOKEN_MUTATING_ENDPOINTS.has(endpoint.split('?')[0]);
    const tokenMutationController = isTokenMutation ? new AbortController() : null;
    const responsePromise = fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies
      signal: tokenMutationController?.signal || options.signal,
    });
    if (tokenMutationController) {
      const trackedResponse = responsePromise.then(
        () => undefined,
        () => undefined,
      );
      inFlightTokenMutationResponses.set(trackedResponse, tokenMutationController);
      void trackedResponse.finally(() => {
        inFlightTokenMutationResponses.delete(trackedResponse);
      });
    }
    response = await responsePromise;
  } catch (err: any) {
    const error: ApiError = {
      error: 'Network error',
      message: err?.message || 'Failed to reach server',
      status: 0,
    };
    throw error;
  }

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    const text = await response.text();
    if (!isAuthBootstrapEndpoint && requestSessionEpoch !== sessionEpoch) {
      throw {
        error: 'Auth session changed',
        message: 'This response belongs to an older login session',
        status: 409,
      } satisfies ApiError;
    }
    if (!response.ok) {
      const error: ApiError = {
        error: `HTTP ${response.status}`,
        message: text || response.statusText,
        status: response.status,
      };
      throw error;
    }
    return text as unknown as T;
  }

  const data = await response.json();

  if (!isAuthBootstrapEndpoint && requestSessionEpoch !== sessionEpoch) {
    throw {
      error: 'Auth session changed',
      message: 'This response belongs to an older login session',
      status: 409,
    } satisfies ApiError;
  }

  if (!response.ok) {
    if (response.status === 401 && !isRetry && !isAuthBootstrapEndpoint) {
      if (requestSessionEpoch !== sessionEpoch) {
        throw {
          error: 'Auth session changed',
          message: 'This request belongs to an older login session',
          status: 409,
        } satisfies ApiError;
      }

      // Another request may already have refreshed while this older request
      // was still in flight. Replay with the current token without rotating it
      // a second time.
      if (requestTokenVersion !== accessTokenVersion) {
        return request<T>(endpoint, options, true);
      }

      try {
        await refreshAuthSession();
        return request<T>(endpoint, options, true);
      } catch (refreshError: any) {
        // Surface temporary refresh outages instead of destroying a valid
        // refresh credential. Terminal 401/403 failures already clear state.
        if (refreshError?.status !== 401 && refreshError?.status !== 403) {
          throw refreshError;
        }
      }
    }

    const error: ApiError = {
      error: data.error || 'Request failed',
      details: data.details,
      message: data.message,
      status: response.status,
      meta: data,
    };
    throw error;
  }

  return data;
}

export const apiClient = {
  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'GET' });
  },

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<T> {
    return request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * POST request with multipart/form-data body (e.g. file uploads).
   */
  async postFormData<T>(endpoint: string, body: FormData): Promise<T> {
    return request<T>(endpoint, {
      method: 'POST',
      body,
    });
  },

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any): Promise<T> {
    return request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: any): Promise<T> {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};

export default apiClient;
