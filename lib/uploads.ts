import { ApiError, apiPost } from "@/lib/api"
import {
  ImageProcessingError,
  type ProcessedImage,
} from "@/lib/image-processing"

interface SignedUpload {
  url: string
  headers: Record<string, string>
}

interface ImageUploadResponse {
  id: string
  full: SignedUpload
  thumb: SignedUpload
  previewUrl: string
}

export interface UploadedImage {
  id: string
  // Public URL of the thumbnail, valid until the garden is saved (or for a
  // day), so a restored draft can still show it.
  previewUrl: string
}

/**
 * Reserves an image id with the backend and uploads both files straight to
 * the bucket with the signed URLs it returns. Nothing goes through the
 * backend but the sizes.
 */
export async function uploadImage(
  image: ProcessedImage,
  signal?: AbortSignal
): Promise<UploadedImage> {
  const upload = await apiPost<ImageUploadResponse>(
    "/uploads/images",
    {
      contentType: image.contentType,
      fullSize: image.full.size,
      thumbSize: image.thumb.size,
      width: image.width,
      height: image.height,
    },
    { signal }
  )

  await Promise.all([
    put(upload.full, image.full, signal),
    put(upload.thumb, image.thumb, signal),
  ])

  return { id: upload.id, previewUrl: upload.previewUrl }
}

async function put(target: SignedUpload, body: Blob, signal?: AbortSignal) {
  // No Authorization header: the signature in the URL is the credential.
  const response = await fetch(target.url, {
    method: "PUT",
    headers: target.headers,
    body,
    signal,
  })

  if (!response.ok) {
    throw new ApiError(
      `Photo upload failed with status ${response.status}`,
      response.status
    )
  }
}

// Message keys under `GardenForm.photos.errors`.
export type ImageUploadErrorCode =
  "unreadable" | "tooLarge" | "tooMany" | "disabled" | "failed"

export function imageUploadErrorCode(error: unknown): ImageUploadErrorCode {
  if (error instanceof ImageProcessingError) return error.code
  if (error instanceof ApiError) {
    if (error.code === "TOO_MANY_UPLOADS") return "tooMany"
    if (error.code === "IMAGES_DISABLED") return "disabled"
  }
  return "failed"
}

// Errors where trying the same file again can't help.
export function isFinalImageError(code: ImageUploadErrorCode): boolean {
  return code === "unreadable" || code === "tooLarge" || code === "disabled"
}
