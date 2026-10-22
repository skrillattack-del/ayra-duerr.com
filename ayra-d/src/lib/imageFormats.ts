/**
 * Shared image format helpers for the frontend.
 *
 * iOS Safari sends HEIC photos with `image/heic` MIME type on modern iOS,
 * but older versions (and some third-party apps) send an empty string or
 * `application/octet-stream` with just a `.heic` extension. These helpers
 * detect formats by extension as a fallback so uploads never get silently
 * dropped.
 */

/** Extensions (lowercase, no dot) that browsers cannot reliably render. The backend converts these to JPEG. */
const CONVERT_EXTENSIONS = new Set(['heic', 'heif', 'avif', 'tif', 'tiff', 'bmp', 'psd'])

/** Extensions (lowercase, no dot) that are already web-native. */
const NATIVE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp'])

/** Extensions that must never be accepted (XSS vector). */
const REJECTED_EXTENSIONS = new Set(['svg', 'svgz'])

/** MIME types that need backend conversion to JPEG. */
const CONVERT_MIME_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
  'image/avif',
  'image/tiff',
  'image/bmp',
  'image/x-ms-bmp',
  'image/x-bmp',
  'image/x-tiff',
])

/** `accept` attribute value for image-only file inputs. Includes explicit extensions because `image/*` doesn't reliably match HEIC on iOS. */
export const ACCEPT_IMAGES = 'image/*,.heic,.heif,.avif,.tif,.tiff,.bmp'

/** `accept` attribute value for image + video file inputs (chat attachments). */
export const ACCEPT_MEDIA = 'image/*,video/*,.heic,.heif,.avif,.tif,.tiff,.bmp,.mov'

function extOf(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
}

/**
 * True if the file is an iPhone HEIC/HEIF photo (or other format the backend will convert).
 * Checks both MIME type and extension since iOS is inconsistent.
 */
export function needsConversion(file: File): boolean {
  const ext = extOf(file.name)
  const mime = (file.type || '').toLowerCase()
  return CONVERT_EXTENSIONS.has(ext) || CONVERT_MIME_TYPES.has(mime)
}

/**
 * True if the file is an HEIC/HEIF specifically (iPhone default photo format).
 */
export function isHeic(file: File): boolean {
  const ext = extOf(file.name)
  const mime = (file.type || '').toLowerCase()
  return ext === 'heic' || ext === 'heif' || mime === 'image/heic' || mime === 'image/heif'
}

/**
 * True if the file should be rejected (SVG = XSS vector, or unknown type).
 */
export function isRejectedImage(file: File): boolean {
  const ext = extOf(file.name)
  const mime = (file.type || '').toLowerCase()
  if (REJECTED_EXTENSIONS.has(ext) || mime === 'image/svg+xml') return true
  return false
}

/**
 * True if the file is an acceptable image upload (native or convertible format).
 * Use this in file input change handlers as a guard before uploading.
 */
export function isAcceptedImage(file: File): boolean {
  if (isRejectedImage(file)) return false
  const ext = extOf(file.name)
  const mime = (file.type || '').toLowerCase()
  return (
    mime.startsWith('image/') ||
    NATIVE_EXTENSIONS.has(ext) ||
    CONVERT_EXTENSIONS.has(ext)
  )
}

/**
 * True if the file is an acceptable video upload (for chat attachments).
 */
export function isAcceptedVideo(file: File): boolean {
  const ext = extOf(file.name)
  const mime = (file.type || '').toLowerCase()
  return mime.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext)
}

/**
 * Human-readable label for the file's format, e.g. "HEIC" or "JPEG".
 */
export function formatLabel(file: File): string {
  const ext = extOf(file.name)
  if (ext) return ext.toUpperCase()
  if (file.type) return file.type.replace('image/', '').toUpperCase()
  return 'unknown'
}
