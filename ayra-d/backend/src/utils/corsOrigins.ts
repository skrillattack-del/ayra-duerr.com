const PRODUCTION_FRONTEND_ORIGINS = [
  'https://www.gongafitness.com',
  'https://gongafitness.com',
];

const LOCAL_FRONTEND_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

export function resolveAllowedCorsOrigins(
  env: { CORS_ORIGIN?: string; FRONTEND_URL?: string; NODE_ENV?: string } = {
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    FRONTEND_URL: process.env.FRONTEND_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
): Set<string> {
  const configured = [env.CORS_ORIGIN, env.FRONTEND_URL]
    .flatMap((value) => (value || '').split(','))
    .map((value) => normalizeOrigin(value))
    .filter((value): value is string => !!value);

  const defaults = env.NODE_ENV === 'production'
    ? PRODUCTION_FRONTEND_ORIGINS
    : [...PRODUCTION_FRONTEND_ORIGINS, ...LOCAL_FRONTEND_ORIGINS];
  return new Set([...defaults, ...configured]);
}

const allowedCorsOrigins = resolveAllowedCorsOrigins();

export function isCorsOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  return !!normalized && allowedCorsOrigins.has(normalized);
}

export function corsOriginDelegate(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
): void {
  callback(null, isCorsOriginAllowed(origin));
}
