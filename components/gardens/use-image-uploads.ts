"use client"

import * as React from "react"

import { processImage, type ImageContentType } from "@/lib/image-processing"
import {
  imageUploadErrorCode,
  uploadImage,
  type ImageUploadErrorCode,
} from "@/lib/uploads"

// The same values as the `state` prop of `Attachment`.
export type DraftImageStatus = "processing" | "uploading" | "done" | "error"

// A photo in the garden form: saved, being uploaded, or failed.
export interface DraftImage {
  // Stable key for the form, also before the upload has an id.
  localId: string
  // Once uploaded, or for photos the garden already had.
  id?: string
  // Thumbnail to show.
  url: string
  // Full-size image for the gallery.
  fullUrl?: string
  // Public thumbnail of a new upload, valid for a day. Drafts store it instead
  // of `url`, which is a blob URL that dies with the page.
  previewUrl?: string
  status: DraftImageStatus
  error?: ImageUploadErrorCode
  // Original file name, to tell failed photos apart.
  name?: string
  // Of the uploaded full-size image.
  contentType?: ImageContentType
  size?: number
  width?: number
  height?: number
}

// Uploads running at once; the rest wait their turn.
const MAX_PARALLEL = 2

/**
 * Resizes and uploads photos as soon as they're picked, so saving the garden
 * doesn't wait for them. Progress is reported through `update`, which patches
 * the image with that `localId` wherever the form keeps it.
 */
export function useImageUploads(
  update: (localId: string, changes: Partial<DraftImage>) => void
) {
  const updateRef = React.useRef(update)
  React.useEffect(() => {
    updateRef.current = update
  }, [update])

  // Created on first use, from event handlers, so refs are never read
  // during render.
  const queueRef = React.useRef<UploadQueue | null>(null)
  React.useEffect(
    () => () => {
      queueRef.current?.dispose()
      queueRef.current = null
    },
    []
  )

  return React.useMemo(() => {
    const queue = () => (queueRef.current ??= createUploadQueue(updateRef))
    return {
      /** Queues a picked file and returns the image to add to the form. */
      add: (file: File) => queue().add(file),
      retry: (localId: string) => queue().retry(localId),
      /** Stops the upload of a photo removed from the form. */
      cancel: (localId: string) => queueRef.current?.cancel(localId),
    }
  }, [])
}

type UploadQueue = ReturnType<typeof createUploadQueue>

function createUploadQueue(
  updateRef: React.RefObject<
    (localId: string, changes: Partial<DraftImage>) => void
  >
) {
  const update = (localId: string, changes: Partial<DraftImage>) =>
    updateRef.current(localId, changes)
  const files = new Map<string, File>()
  const controllers = new Map<string, AbortController>()
  const objectUrls: string[] = []
  let waiting: string[] = []
  let active = 0

  function objectUrl(blob: Blob) {
    const url = URL.createObjectURL(blob)
    objectUrls.push(url)
    return url
  }

  async function run(localId: string) {
    const file = files.get(localId)
    if (!file) return

    const controller = new AbortController()
    controllers.set(localId, controller)
    const report = (changes: Partial<DraftImage>) => {
      if (!controller.signal.aborted) update(localId, changes)
    }

    report({ status: "processing", error: undefined })
    try {
      const processed = await processImage(file)
      if (controller.signal.aborted) return
      report({
        status: "uploading",
        url: objectUrl(processed.thumb),
        fullUrl: objectUrl(processed.full),
        contentType: processed.contentType,
        size: processed.full.size,
        width: processed.width,
        height: processed.height,
      })

      const uploaded = await uploadImage(processed, controller.signal)
      files.delete(localId)
      report({
        status: "done",
        id: uploaded.id,
        previewUrl: uploaded.previewUrl,
      })
    } catch (error) {
      report({ status: "error", error: imageUploadErrorCode(error) })
    } finally {
      controllers.delete(localId)
    }
  }

  function pump() {
    while (active < MAX_PARALLEL && waiting.length > 0) {
      const localId = waiting.shift()!
      active += 1
      void run(localId).finally(() => {
        active -= 1
        pump()
      })
    }
  }

  return {
    /** Queues a picked file and returns the image to add to the form. */
    add(file: File): DraftImage {
      const localId = crypto.randomUUID()
      files.set(localId, file)
      waiting.push(localId)
      // Deferred so the caller adds the image before progress arrives.
      queueMicrotask(pump)
      return {
        localId,
        url: objectUrl(file),
        status: "processing",
        name: file.name,
      }
    },

    retry(localId: string) {
      if (!files.has(localId) || waiting.includes(localId)) return
      update(localId, { status: "processing", error: undefined })
      waiting.push(localId)
      pump()
    },

    /** Stops the upload of a photo removed from the form. */
    cancel(localId: string) {
      controllers.get(localId)?.abort()
      waiting = waiting.filter((id) => id !== localId)
      files.delete(localId)
    },

    dispose() {
      controllers.forEach((controller) => controller.abort())
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    },
  }
}
