/**
 * Image processing service — converts iPhone HEIC/HEIF and other
 * non-web-native formats (AVIF, TIFF, BMP) to JPEG on upload.
 *
 * Formats already browser-friendly (JPEG, PNG, GIF, WebP) pass through
 * untouched — no re-encoding, no quality loss.
 *
 * sharp 0.33+ ships prebuilt libvips binaries with libheif, so HEIC
 * decode works out of the box on linux-x64, linuxmusl-x64 (Alpine),
 * win32-x64, and darwin-arm64/x64.
 */

// Lazy-load sharp so the backend still boots if the native binary
// fails to install (e.g. exotic platform). Conversion is skipped and
// the original file is stored as-is in that case.
let sharpModule: typeof import('sharp') | null = null
let sharpLoadFailed = false

async function getSharp(): Promise<typeof import('sharp') | null> {
  if (sharpLoadFailed) return null
  if (sharpModule) return sharpModule
  try {
    sharpModule = (await import('sharp')).default
    return sharpModule
  } catch (err) {
    sharpLoadFailed = true
    console.error('[imageService] sharp failed to load — HEIC/HEIF conversion disabled:', err)
    return null
  }
}

// ── Format detection ────────────────────────────────────────────────────────

/** MIME types that browsers cannot reliably render — need conversion to JPEG. */
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
  'image/vnd.adobe.photoshop', // PSD — sharp can read these too
])

/** File extensions (lowercase, no dot) that need conversion. */
const CONVERT_EXTENSIONS = new Set([
  'heic', 'heif', 'avif', 'tif', 'tiff', 'bmp', 'psd',
])

/** MIME types that are already web-native — pass through unchanged. */
const PASSTHROUGH_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

/** Extensions (lowercase, no dot) that are already web-native. */
const PASSTHROUGH_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp',
])

/** MIME types that must be rejected outright (security risk). */
const REJECT_MIME_TYPES = new Set([
  'image/svg+xml', // XSS vector — never accept
])

/** Extensions that must be rejected outright. */
const REJECT_EXTENSIONS = new Set(['svg', 'svgz'])

export interface ProcessedImage {
  buffer: Buffer
  /** File extension (no dot) for the storage key. */
  ext: string
  /** MIME type for storage / serving. */
  mimetype: string
  /** True if the image was converted from a non-web-native format. */
  converted: boolean
  /** Original format label for logging, e.g. "HEIC". */
  originalFormat: string
}

export interface ProcessImageOptions {
  /** Max width/height in pixels. Image is downscaled (never upscaled) to fit. */
  maxDimension?: number
  /** JPEG quality for converted images (1-100). Default 85. */
  quality?: number
}

/**
 * Extract lowercase extension from a filename, or '' if none.
 */
function extOf(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
}

/**
 * Detect the "real" format of an uploaded image, accounting for the fact
 * that iOS Safari often sends HEIC files with an empty or generic MIME type.
 */
export function detectImageFormat(mimetype: string, originalname: string): 'convert' | 'passthrough' | 'reject' {
  const ext = extOf(originalname)
  const mime = (mimetype || '').toLowerCase()

  if (REJECT_MIME_TYPES.has(mime) || REJECT_EXTENSIONS.has(ext)) return 'reject'
  if (CONVERT_MIME_TYPES.has(mime) || CONVERT_EXTENSIONS.has(ext)) return 'convert'
  if (PASSTHROUGH_MIME_TYPES.has(mime) || PASSTHROUGH_EXTENSIONS.has(ext)) return 'passthrough'

  // Unknown — reject to be safe (could be anything, including disguised payloads)
  return 'reject'
}

/**
 * Human-readable label for the original format, for logging.
 */
function formatLabel(mimetype: string, originalname: string): string {
  const ext = extOf(originalname)
  if (ext) return ext.toUpperCase()
  if (mimetype) return mimetype.replace('image/', '').toUpperCase()
  return 'unknown'
}

// ── Processing ──────────────────────────────────────────────────────────────

/**
 * Process an uploaded image buffer.
 *
 * - Web-native formats (JPEG, PNG, GIF, WebP) → returned unchanged.
 * - HEIC, HEIF, AVIF, TIFF, BMP, PSD → converted to JPEG, EXIF stripped,
 *   optionally downscaled.
 * - SVG → throws (rejected before reaching here by detectImageFormat,
 *   but double-check).
 *
 * If sharp is unavailable, the original buffer is returned with a warning
 * (the file may not render in all browsers, but the upload doesn't fail).
 */
export async function processImage(
  buffer: Buffer,
  mimetype: string,
  originalname: string,
  options: ProcessImageOptions = {},
): Promise<ProcessedImage> {
  const { maxDimension, quality = 85 } = options
  const format = detectImageFormat(mimetype, originalname)
  const label = formatLabel(mimetype, originalname)

  if (format === 'reject') {
    throw new Error(`Unsupported image format: ${label}`)
  }

  // Already web-native — no conversion needed
  if (format === 'passthrough') {
    const ext = extOf(originalname) || (mimetype === 'image/jpeg' ? 'jpg' : mimetype.replace('image/', ''))
    return {
      buffer,
      ext,
      mimetype: mimetype || 'image/jpeg',
      converted: false,
      originalFormat: label,
    }
  }

  // Needs conversion — HEIC/HEIF/AVIF/TIFF/BMP/PSD → JPEG
  const sharp = await getSharp()
  if (!sharp) {
    // Graceful degradation: store original. Most modern browsers can
    // actually render HEIC now, so this isn't catastrophic.
    console.warn(`[imageService] sharp unavailable — storing ${label} without conversion`)
    const ext = extOf(originalname) || 'heic'
    return {
      buffer,
      ext,
      mimetype: mimetype || 'image/heic',
      converted: false,
      originalFormat: label,
    }
  }

  try {
    let pipeline = sharp(buffer, { failOn: 'none' })

    // Auto-rotate based on EXIF orientation before stripping metadata
    pipeline = pipeline.rotate()

    // Downscale if larger than maxDimension (never upscale)
    if (maxDimension) {
      pipeline = pipeline.resize(maxDimension, maxDimension, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    }

    // Convert to JPEG, strip all metadata (EXIF, GPS, camera info)
    const converted = await pipeline
      .jpeg({ quality, mozjpeg: true })
      .toBuffer()

    console.log(`[imageService] Converted ${label} → JPEG (${buffer.length} → ${converted.length} bytes)`)

    return {
      buffer: converted,
      ext: 'jpg',
      mimetype: 'image/jpeg',
      converted: true,
      originalFormat: label,
    }
  } catch (err: any) {
    // If sharp fails to decode (corrupt file, unsupported HEIC variant, etc.)
    // reject the upload rather than storing an unusable file.
    console.error(`[imageService] Failed to convert ${label}:`, err?.message || err)
    throw new Error(`Failed to process ${label} image: ${err?.message || 'decode error'}`)
  }
}

// ── Multer fileFilter helpers ───────────────────────────────────────────────

/**
 * Allowed MIME type prefixes/extensions for multer fileFilter.
 * Used to reject obviously bad files early (before buffering them in memory).
 */
export const ALLOWED_IMAGE_MIME_PREFIXES = ['image/']
export const ALLOWED_IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'heic', 'heif', 'avif', 'tif', 'tiff', 'bmp',
]
export const ALLOWED_VIDEO_MIME_PREFIXES = ['video/']

/**
 * Build a multer fileFilter that accepts images (including HEIC) and
 * optionally videos, while rejecting SVG and unknown types.
 *
 * iOS Safari sends HEIC as `image/heic` or sometimes with an empty MIME type
 * but a `.heic` extension — so we check both.
 */
export function createMediaFileFilter(options: { allowVideo?: boolean } = {}) {
  const { allowVideo = false } = options
  return (
    _req: any,
    file: { mimetype: string; originalname: string },
    cb: (error: Error | null, acceptFile?: boolean) => void,
  ) => {
    const ext = extOf(file.originalname)
    const mime = (file.mimetype || '').toLowerCase()

    // Always reject SVG (XSS vector)
    if (REJECT_MIME_TYPES.has(mime) || REJECT_EXTENSIONS.has(ext)) {
      cb(new Error('SVG files are not allowed'))
      return
    }

    const isImage =
      mime.startsWith('image/') ||
      ALLOWED_IMAGE_EXTENSIONS.includes(ext)
    const isVideo =
      allowVideo && (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'quicktime'].includes(ext))

    if (isImage || isVideo) {
      cb(null, true)
    } else {
      cb(new Error('Only image and video files are allowed'))
    }
  }
}

/** Build a multer fileFilter for image-only uploads (avatars, meal photos). */
export function createImageFileFilter() {
  return createMediaFileFilter({ allowVideo: false })
}
