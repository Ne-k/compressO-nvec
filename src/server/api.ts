import { formatBytes } from '@/utils/fs'
import { runtime } from '@/utils/runtime'

export type UploadedVideo = {
  id: string
  originalName: string
  storedPath: string
  publicUrl: string
  thumbnailUrl?: string | null
  size: number
  sizeLabel: string
  duration?: number | null
  fps?: number | null
  dimensions?: [number, number] | null
}

export type CompressionResult = {
  videoId: string
  fileName: string
  filePath: string
  fileMetadata: {
    fileName: string
    path: string
    mimeType: string
    extension: string
    size: number
  }
}

export type CompressionOptions = {
  extension: string
  quality: number
}

function buildUrl(pathname: string) {
  const base = runtime.apiBase?.replace?.(/\/$/, '') ?? ''
  return `${base}${pathname}`
}

export async function uploadVideos(files: File[]): Promise<UploadedVideo[]> {
  if (!files.length) return []
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }

  const response = await fetch(buildUrl('/api/upload'), {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Upload failed')
  }

  const payload = await response.json()
  const items = Array.isArray(payload?.files) ? payload.files : []

  return items.map((item: any) => ({
    id: item.id,
    originalName: item.originalName,
    storedPath: item.storedPath,
    publicUrl: buildUrl(item.publicUrl),
    thumbnailUrl: item.thumbnailUrl ? buildUrl(item.thumbnailUrl) : null,
    size: item.size,
    sizeLabel: formatBytes(item.size ?? 0),
    duration: item.duration ?? null,
    fps: item.fps ?? null,
    dimensions: item.dimensions ?? null,
  }))
}

export function listenToCompression(
  batchId: string,
  handlers: {
    onProgress?: (payload: any) => void
    onComplete?: (payload: any) => void
    onError?: (err: Error) => void
  },
) {
  const es = new EventSource(buildUrl(`/api/events/${batchId}`))
  es.addEventListener('VideoCompressionProgress', (evt) => {
    try {
      const data = (evt as MessageEvent).data
      handlers.onProgress?.(JSON.parse(data as string))
    } catch (err) {
      handlers.onError?.(
        err instanceof Error
          ? err
          : new Error((err as any)?.message ?? 'Event parse error'),
      )
    }
  })
  es.addEventListener(
    'BatchCompressionIndividualCompressionCompletion',
    (evt) => {
      try {
        const data = (evt as MessageEvent).data
        handlers.onComplete?.(JSON.parse(data as string))
      } catch (err) {
        handlers.onError?.(
          err instanceof Error
            ? err
            : new Error((err as any)?.message ?? 'Event parse error'),
        )
      }
    },
  )
  es.onerror = (err) => {
    handlers.onError?.(
      err instanceof Error
        ? err
        : new Error((err as any)?.message ?? 'Event source error'),
    )
  }

  return () => es.close()
}

export async function startCompression(
  batchId: string,
  videos: UploadedVideo[],
  options: CompressionOptions,
): Promise<Record<string, CompressionResult>> {
  const response = await fetch(buildUrl('/api/compress'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      batchId,
      videos: videos.map((v) => ({
        videoId: v.id,
        inputPath: v.storedPath,
        convertToExtension: options.extension,
        quality: options.quality,
      })),
    }),
  })

  if (!response.ok) {
    throw new Error('Compression failed')
  }

  const payload = await response.json()
  const results = (payload?.results ?? {}) as Record<string, CompressionResult>
  const normalized: Record<string, CompressionResult> = {}
  for (const [key, value] of Object.entries(results)) {
    const result = value as CompressionResult
    normalized[key] = {
      ...result,
      filePath: buildUrl(result?.filePath ?? ''),
    }
  }
  return normalized
}
