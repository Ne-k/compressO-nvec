import { motion } from 'framer-motion'
import React, { useMemo, useRef, useState } from 'react'

import Button from '@/components/Button'
import Icon from '@/components/Icon'
import Layout from '@/components/Layout'
import Spinner from '@/components/Spinner'
import { toast } from '@/components/Toast'
import {
  CompressionResult,
  listenToCompression,
  startCompression,
  UploadedVideo,
  uploadVideos,
} from '@/server/api'
import { extensions } from '@/types/compression'
import { formatBytes } from '@/utils/fs'

function parseHmsToSeconds(value: string | null | undefined) {
  if (!value) return 0
  const parts = value.split(':').map((p) => Number(p))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 0
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

function ServerApp() {
  const [videos, setVideos] = useState<UploadedVideo[]>([])
  const [quality, setQuality] = useState(50)
  const [extension, setExtension] =
    useState<keyof typeof extensions.video>('mp4')
  const [isUploading, setUploading] = useState(false)
  const [isCompressing, setCompressing] = useState(false)
  const [progressMap, setProgressMap] = useState<Record<string, number>>({})
  const [etaMap, setEtaMap] = useState<Record<string, string | null>>({})
  const [results, setResults] = useState<Record<string, CompressionResult>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videosRef = useRef<UploadedVideo[]>([])
  videosRef.current = videos
  const gpuLabel = 'auto-detect'

  const sortedVideos = useMemo(
    () =>
      [...videos].sort((a, b) => a.originalName.localeCompare(b.originalName)),
    [videos],
  )

  const handleFiles = async (files: File[]) => {
    if (!files.length) return
    setUploading(true)
    try {
      const uploaded = await uploadVideos(files)
      setVideos((prev) => [...prev, ...uploaded])
    } catch (err: any) {
      toast.error(err?.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleFileInput = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(evt.target.files ?? [])
    void handleFiles(files)
    evt.target.value = ''
  }

  const handleDrop = (evt: React.DragEvent<HTMLDivElement>) => {
    evt.preventDefault()
    const files = Array.from(evt.dataTransfer.files ?? [])
    void handleFiles(files)
  }

  const handleDragOver = (evt: React.DragEvent<HTMLDivElement>) => {
    evt.preventDefault()
  }

  const removeVideo = (videoId: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== videoId))
  }

  const handleCompress = async () => {
    if (!videos.length) {
      toast.error('Add at least one video to compress.')
      return
    }
    setCompressing(true)
    setProgressMap({})
    setEtaMap({})
    setResults({})

    const batchId = `${Date.now()}`
    const stopListening = listenToCompression(batchId, {
      onProgress: (payload) => {
        const currentSeconds = parseHmsToSeconds(payload?.currentDuration)
        const video = videosRef.current.find((v) => v.id === payload?.videoId)
        const percent = video?.duration
          ? Math.min(100, (currentSeconds / (video.duration || 1)) * 100)
          : 0
        setProgressMap((prev) => ({ ...prev, [payload.videoId]: percent }))
        setEtaMap((prev) => ({
          ...prev,
          [payload.videoId]: payload?.eta ?? null,
        }))
      },
      onComplete: (payload) => {
        if (payload?.result) {
          setResults((prev) => ({
            ...prev,
            [payload.result.videoId]: payload.result,
          }))
          setProgressMap((prev) => ({ ...prev, [payload.result.videoId]: 100 }))
          setEtaMap((prev) => ({ ...prev, [payload.result.videoId]: null }))
        }
      },
      onError: () => {
        // Swallow SSE disconnects; the final response will still be handled.
      },
    })

    try {
      const jobResults = await startCompression(batchId, videos, {
        extension,
        quality,
      })
      setResults(jobResults)
    } catch (err: any) {
      toast.error(err?.message ?? 'Compression failed')
    } finally {
      stopListening?.()
      setCompressing(false)
    }
  }

  return (
    <Layout
      containerProps={{ className: 'relative' }}
      childrenProps={{ className: 'm-auto w-full' }}
      hideLogo
    >
      <div className="flex flex-col gap-6 w-full h-full">
        <section className="w-full border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*"
            className="hidden"
            onChange={handleFileInput}
          />
          <motion.div
            role="button"
            tabIndex={0}
            className="flex flex-col items-center justify-center gap-3"
            initial={{ scale: 0.95, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1, transition: { duration: 0.4 } }}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(evt) => {
              if (evt.key === 'Enter') {
                fileInputRef.current?.click()
              }
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <Icon name="videoFile" className="text-primary" size={60} />
            <p className="italic text-sm text-gray-600 dark:text-gray-400">
              Drag & Drop or click to select videos
            </p>
            {isUploading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner size="sm" /> Uploading...
              </div>
            ) : null}
          </motion.div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 max-h-[60vh] overflow-auto">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Files</p>
              <p className="text-xs text-gray-500">GPU: NVENC {gpuLabel}</p>
            </div>
            {sortedVideos.length === 0 ? (
              <p className="text-sm text-gray-500">No videos added yet.</p>
            ) : null}
            {sortedVideos.map((video) => {
              const progress = progressMap[video.id]
              const eta = etaMap[video.id]
              const result = results[video.id]
              return (
                <div
                  key={video.id}
                  className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 flex gap-3 items-center"
                >
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.originalName}
                      className="w-20 h-16 object-cover rounded-md border border-zinc-200 dark:border-zinc-700"
                    />
                  ) : (
                    <div className="w-20 h-16 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded-md">
                      <Icon name="videoFile" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {video.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {video.dimensions
                        ? `${video.dimensions[0]}x${video.dimensions[1]}`
                        : '—'}{' '}
                      ·{video.fps ? ` ${Math.round(video.fps)} fps ·` : ' '}{' '}
                      {video.sizeLabel}
                    </p>
                    {progress !== undefined ? (
                      <div className="mt-2">
                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">
                          {eta ? `ETA ${eta}` : ''}
                        </p>
                      </div>
                    ) : null}
                    {result ? (
                      <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                        <Icon name="tick" size={16} /> Ready ·{' '}
                        {formatBytes(result?.fileMetadata?.size ?? 0)}
                        <a
                          href={result.filePath}
                          className="underline text-primary"
                          download
                        >
                          Download
                        </a>
                      </div>
                    ) : null}
                  </div>
                  {!isCompressing ? (
                    <Button
                      size="sm"
                      variant="light"
                      onPress={() => removeVideo(video.id)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="border-2 border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-4 h-fit">
            <div>
              <p className="font-semibold mb-2">Output format</p>
              <select
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent p-2"
                value={extension}
                onChange={(evt) =>
                  setExtension(
                    evt.target.value as keyof typeof extensions.video,
                  )
                }
                disabled={isCompressing}
              >
                {Object.keys(extensions.video).map((ext) => (
                  <option key={ext} value={ext}>
                    .{ext}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold">Quality</p>
                <span className="text-xs text-gray-500">{quality}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={quality}
                onChange={(evt) => setQuality(Number(evt.target.value))}
                className="w-full"
                disabled={isCompressing}
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Higher means better quality and larger files.
              </p>
            </div>
            <Button
              onPress={handleCompress}
              isDisabled={!videos.length || isUploading || isCompressing}
              isLoading={isCompressing}
              fullWidth
              className="bg-primary text-white"
            >
              {isCompressing ? 'Compressing…' : 'Start Compression'}
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  )
}

export default ServerApp
