import type { TerminalNotification } from '@/providers/ToastProvider'
import { isApiError, mapApiErrorToToast, getRetryAfterSeconds as getRetryAfterSecondsShared } from '@/lib/apiFeedback'

export type AuthMode = 'login' | 'signup'
type AuthField = 'email' | 'password' | 'codename' | 'general'
export type FieldErrors = Partial<Record<AuthField, string>>

export function getEmailSector(email: string): string {
  const domain = email.split('@')[1]?.split('.')[0] || 'EMAIL'
  return domain.toUpperCase()
}


function extractFieldErrors(details: unknown): FieldErrors {
  if (!Array.isArray(details)) return {}

  const result: FieldErrors = {}
  for (const issue of details as any[]) {
    const path = Array.isArray(issue?.path) ? issue.path : []
    const field = typeof path[0] === 'string' ? path[0] : undefined
    if (!field) continue

    const message =
      typeof issue?.message === 'string' && issue.message.trim().length > 0
        ? issue.message
        : 'Invalid value'

    if (field === 'email') result.email ||= message
    if (field === 'password') result.password ||= message
    if (field === 'display_name') result.codename ||= message
  }

  return result
}

function firstFieldError(fieldErrors: FieldErrors): string | undefined {
  return fieldErrors.email || fieldErrors.password || fieldErrors.codename
}

const getRetryAfterSeconds = getRetryAfterSecondsShared

export function mapAuthErrorToToast(params: {
  mode: AuthMode
  email?: string
  error: unknown
}): { toast: Omit<TerminalNotification, 'id'>; fieldErrors?: FieldErrors; retryAfterSeconds?: number } {
  const sector = params.email ? getEmailSector(params.email) : 'AUTH'

  if (!isApiError(params.error)) {
    return { toast: mapApiErrorToToast(params.error, { sector: 'AUTH' }) }
  }

  const apiError = params.error
  const status = apiError.status

  // Generic connection-level failures (network/CORS) — shared copy, no auth-specific override needed.
  if (status === 0) {
    return { 
      toast: mapApiErrorToToast(apiError, { sector: 'SYSTEM' }),
      fieldErrors: { general: "Can't reach the server. Please check your connection or try again later." }
    }
  }

  if (status === 429) {
    const retryAfterSeconds = getRetryAfterSeconds(apiError)
    return {
      toast: {
        status: 'WARN',
        title: 'TOO MANY ATTEMPTS',
        message: retryAfterSeconds
          ? `Cooldown active. Try again in ${retryAfterSeconds}s.`
          : 'Cooldown active. Try again shortly.',
        sector: 'AUTH',
      },
      retryAfterSeconds,
    }
  }

  if (status === 400 && apiError.error?.toLowerCase().includes('validation')) {
    const fieldErrors = extractFieldErrors(apiError.details)
    return {
      toast: {
        status: 'WARN',
        title: 'VALIDATION ERROR',
        message: firstFieldError(fieldErrors) || 'Check your inputs and try again.',
        sector: 'AUTH',
      },
      fieldErrors,
    }
  }

  if (apiError.error?.toLowerCase().includes('already registered')) {
    return {
      toast: {
        status: 'WARN',
        title: 'OPERATIVE EXISTS',
        message: 'This email is already registered. Switch to login to proceed.',
        sector,
      },
      fieldErrors: { email: 'Email already registered' },
    }
  }

  if (status === 401 && apiError.error?.toLowerCase().includes('invalid credentials')) {
    return {
      toast: {
        status: 'ERROR',
        title: 'ACCESS DENIED',
        message:
          params.mode === 'login'
            ? 'Email or password incorrect. If you are new, create an account.'
            : 'Credentials rejected. Double-check your inputs and try again.',
        sector: 'AUTH',
      },
      fieldErrors:
        params.mode === 'login' ? { password: 'Email or password incorrect' } : undefined,
    }
  }

  if (status && status >= 500) {
    return {
      toast: {
        status: 'ERROR',
        title: 'AUTH SERVICE DOWN',
        message: 'Server error. Please try again in a moment.',
        sector: 'SYSTEM',
      },
      fieldErrors: { general: 'Server error. Please try again in a moment.' }
    }
  }

  // Fall back to the shared generic mapping (403/404/unknown statuses).
  return { toast: mapApiErrorToToast(apiError, { sector: 'AUTH' }) }
}
