// Photos are resized and re-encoded in the browser before upload. Drawing to a
// canvas and exporting it drops every metadata field of the original file,
// including the GPS position phones store in photos taken at home: the
// original file is never uploaded.

// Longest side of the full-size image.
const FULL_MAX_SIDE = 1600
// Side of the square, center-cropped thumbnail.
const THUMB_SIDE = 320
// Originals bigger than this are refused before decoding.
export const IMAGE_ORIGINAL_MAX_BYTES = 25 * 1024 * 1024
// Must match the backend limits (`src/uploads/uploads.constants.ts`).
const FULL_MAX_BYTES = 1_500_000
const THUMB_MAX_BYTES = 200_000

export type ImageContentType = "image/webp" | "image/jpeg"

export interface ProcessedImage {
  full: Blob
  thumb: Blob
  contentType: ImageContentType
  // Of the full-size image.
  width: number
  height: number
}

export type ImageProcessingErrorCode = "unreadable" | "tooLarge"

export class ImageProcessingError extends Error {
  constructor(readonly code: ImageProcessingErrorCode) {
    super(`Could not process the photo: ${code}`)
  }
}

export async function processImage(file: File): Promise<ProcessedImage> {
  if (file.size > IMAGE_ORIGINAL_MAX_BYTES) {
    throw new ImageProcessingError("tooLarge")
  }

  let bitmap: ImageBitmap
  try {
    // Applies the EXIF rotation, so portrait photos stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    // Formats the browser can't decode, such as HEIC on most desktops.
    throw new ImageProcessingError("unreadable")
  }

  try {
    const scale = Math.min(
      1,
      FULL_MAX_SIDE / Math.max(bitmap.width, bitmap.height)
    )
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const fullCanvas = draw(
      bitmap,
      0,
      0,
      bitmap.width,
      bitmap.height,
      width,
      height
    )

    const side = Math.min(bitmap.width, bitmap.height)
    const thumbSide = Math.min(THUMB_SIDE, side)
    const thumbCanvas = draw(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      thumbSide,
      thumbSide
    )

    // Some Safari versions can't encode WebP and silently return PNG.
    let contentType: ImageContentType = "image/webp"
    let full = await encode(fullCanvas, contentType, 0.8)
    if (full.type !== "image/webp") {
      contentType = "image/jpeg"
      full = await encode(fullCanvas, contentType, 0.82)
    }
    if (full.size > FULL_MAX_BYTES) {
      full = await encode(fullCanvas, contentType, 0.6)
    }
    const thumb = await encode(thumbCanvas, contentType, 0.75)

    if (full.size > FULL_MAX_BYTES || thumb.size > THUMB_MAX_BYTES) {
      throw new ImageProcessingError("tooLarge")
    }

    return { full, thumb, contentType, width, height }
  } finally {
    bitmap.close()
  }
}

function draw(
  source: ImageBitmap,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) {
    throw new ImageProcessingError("unreadable")
  }
  // JPEG has no transparency: fill it white instead of black.
  context.fillStyle = "#fff"
  context.fillRect(0, 0, width, height)
  context.imageSmoothingQuality = "high"
  context.drawImage(source, sx, sy, sw, sh, 0, 0, width, height)
  return canvas
}

function encode(
  canvas: HTMLCanvasElement,
  type: ImageContentType,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new ImageProcessingError("unreadable")),
      type,
      quality
    )
  )
}
