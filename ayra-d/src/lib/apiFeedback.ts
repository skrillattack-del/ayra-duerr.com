import type { ApiError } from '@/lib/apiClient'
import type { TerminalNotification } from '@/providers/ToastProvider'

export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'error' in error
}

export function getRetryAfterSeconds(error: ApiError): number | undefined {
  const candidate = (error as any)?.meta?.retryAfterSeconds
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : undefined
}

export interface ApiToastOptions {
  /** What the user was trying to do, e.g. "load your workouts" — used in fallback/500 copy. */
  action?: string
  /** Toast sector tag. Defaults to 'SYSTEM'. */
  sector?: string
  /** Custom copy for 404s. */
  notFoundMessage?: string
}

/**
 * Maps any caught API error to a toast-ready notification. Generic — auth flows should
 * use mapAuthErrorToToast (authFeedback.ts) for richer, auth-specific copy, which falls
 * back to this for the cases that don't need special handling.
 */
export function mapApiErrorToToast(error: unknown, options: ApiToastOptions = {}): Omit<TerminalNotification, 'id'> {
  const sector = options.sector || 'SYSTEM'
  const actionSuffix = options.action ? ` while trying to ${options.action}` : ''

  if (!isApiError(error)) {
    return {
      status: 'ERROR',
      title: 'UNEXPECTED ERROR',
      message: `Something went wrong${actionSuffix}. Please try again.`,
      sector,
    }
  }

  const status = error.status

  if (status === 0) {
    return {
      status: 'ERROR',
      title: 'CONNECTION LOST',
      message:
        process.env.NODE_ENV === 'production'
          ? "Can't reach GongaFit right now. Please try again in a moment."
          : 'Backend unreachable. Start the server and try again.',
      sector,
    }
  }

  if (status === 401) {
    return {
      status: 'WARN',
      title: 'SESSION EXPIRED',
      message: 'Please log in again to continue.',
      sector: 'AUTH',
    }
  }

  if (status === 403) {
    return {
      status: 'ERROR',
      title: 'ACCESS DENIED',
      message: "You don't have permission to do that.",
      sector,
    }
  }

  if (status === 404) {
    return {
      status: 'WARN',
      title: 'NOT FOUND',
      message: options.notFoundMessage || "That couldn't be found. It may have been removed.",
      sector,
    }
  }

  if (status === 429) {
    const retryAfterSeconds = getRetryAfterSeconds(error)
    return {
      status: 'WARN',
      title: 'TOO MANY REQUESTS',
      message: retryAfterSeconds
        ? `Slow down — try again in ${retryAfterSeconds}s.`
        : 'Slow down and try again shortly.',
      sector,
    }
  }

  if (status === 400) {
    return {
      status: 'WARN',
      title: 'CHECK YOUR INPUT',
      message: error.message || error.error || 'Please check your input and try again.',
      sector,
    }
  }

  if (status && status >= 500) {
    return {
      status: 'ERROR',
      title: 'SERVER ERROR',
      message: `Something went wrong on our end${actionSuffix}. Please try again shortly.`,
      sector,
    }
  }

  return {
    status: 'ERROR',
    title: 'REQUEST FAILED',
    message: error.message || error.error || `Request failed${actionSuffix}.`,
    sector,
  }
}
