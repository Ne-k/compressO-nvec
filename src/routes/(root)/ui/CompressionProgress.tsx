import { core, event } from '@tauri-apps/api'
import { invoke } from '@tauri-apps/api/core'
import { useEffect, useRef } from 'react'
import { snapshot, useSnapshot } from 'valtio'

import {
  BatchCompressionIndividualCompressionResult,
  CustomEvents,
  VideoCompressionProgress,
} from '@/types/compression'
import { formatBytes } from '@/utils/fs'
import { convertDurationToMilliseconds } from '@/utils/string'
import { appProxy } from '../-state'

function formatMsToHms(ms: number): string {
  const clamped = Math.max(ms, 0)
  const totalSeconds = Math.floor(clamped / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

async function updateDockProgress() {
  const videos = snapshot(appProxy).state.videos
  if (videos.length === 0) return

  const totalProgress = videos.reduce(
    (sum, video) => sum + (video.compressionProgress ?? 0),
    0,
  )
  const batchProgress = totalProgress / videos.length

  try {
    await invoke('set_dock_progress', { progress: batchProgress })
  } catch {
    // Silently fail on non-macOS platforms
  }
}

async function clearDockProgress() {
  try {
    await invoke('clear_dock_badge')
  } catch {
    // Silently fail on non-macOS platforms
  }
}

function CompressionProgress() {
  const {
    state: { batchId },
  } = useSnapshot(appProxy)

  const compressionProgressRef = useRef<event.UnlistenFn>()
  const individualCompressionResultRef = useRef<event.UnlistenFn>()

  useEffect(() => {
    if (batchId) {
      ;(async () => {
        if (compressionProgressRef.current) {
          compressionProgressRef.current?.()
        }
        compressionProgressRef.current =
          await event.listen<VideoCompressionProgress>(
            CustomEvents.VideoCompressionProgress,
            (evt) => {
              const payload = evt?.payload
              if (batchId === payload?.batchId) {
                const videos = snapshot(appProxy).state.videos
                const targetVideoIndex = videos.findIndex(
                  (v) => v.id === payload.videoId,
                )
                if (targetVideoIndex !== -1) {
                  appProxy.state.currentVideoIndex = targetVideoIndex
                  appProxy.state.videos[targetVideoIndex].isCompressing = true

                  const trimConfig =
                    videos[targetVideoIndex]?.config?.trimConfig ?? []

                  const targetVideoDuration =
                    videos[targetVideoIndex].videoDuration ?? 0

                  const videoDurationInMilliseconds =
                    (videos[targetVideoIndex]?.config?.shouldTrimVideo &&
                    trimConfig
                      ? (trimConfig.reduce((a, c) => {
                          a += c.end >= c.start ? c.end - c.start : 0
                          return a
                        }, 0) ?? targetVideoDuration)
                      : targetVideoDuration) * 1000

                  if (!Number.isNaN(videoDurationInMilliseconds)) {
                    const currentDurationInMilliseconds =
                      convertDurationToMilliseconds(payload?.currentDuration) // current duration is the duration processed on the output not input source

                    if (
                      currentDurationInMilliseconds > 0 &&
                      videoDurationInMilliseconds >=
                        currentDurationInMilliseconds
                    ) {
                      appProxy.state.videos[
                        targetVideoIndex
                      ].compressionProgress =
                        (currentDurationInMilliseconds * 100) /
                        videoDurationInMilliseconds

                      const remainingMs =
                        videoDurationInMilliseconds -
                        currentDurationInMilliseconds
                      const etaFromProgress = formatMsToHms(remainingMs)

                      appProxy.state.videos[targetVideoIndex].compressionEta =
                        payload?.eta ?? etaFromProgress

                      updateDockProgress()
                    }
                  }
                }
              }
            },
          )
      })()
      ;(async () => {
        if (individualCompressionResultRef.current) {
          individualCompressionResultRef.current?.()
        }
        individualCompressionResultRef.current =
          await event.listen<BatchCompressionIndividualCompressionResult>(
            CustomEvents.BatchCompressionIndividualCompressionCompletion,
            (evt) => {
              const payload = evt?.payload
              if (batchId === payload?.batchId && payload?.result) {
                const videos = snapshot(appProxy).state.videos
                const targetVideoIndex = videos.findIndex(
                  (v) => v.id === payload.result.videoId,
                )
                if (targetVideoIndex !== -1) {
                  const fileMetadata = payload?.result?.fileMetadata
                  appProxy.state.videos[targetVideoIndex].isProcessCompleted =
                    true
                  appProxy.state.videos[targetVideoIndex].isCompressing = false
                  appProxy.state.videos[targetVideoIndex].compressionProgress =
                    100
                  appProxy.state.videos[targetVideoIndex].compressionEta = null
                  appProxy.state.videos[targetVideoIndex].compressedVideo = {
                    isSuccessful: true,
                    fileName: fileMetadata?.fileName,
                    fileNameToDisplay: `${fileMetadata?.fileName?.slice(
                      0,
                      -((fileMetadata?.extension?.length ?? 0) + 1),
                    )}.${fileMetadata?.extension}`,
                    pathRaw: fileMetadata?.path,
                    path: core.convertFileSrc(fileMetadata?.path ?? ''),
                    mimeType: fileMetadata?.extension,
                    extension: fileMetadata?.extension,
                    size: formatBytes(fileMetadata?.size ?? 0),
                    sizeInBytes: fileMetadata?.size,
                  }
                  if (appProxy.state.videos.length > 1) {
                    appProxy.takeSnapshot('batchCompressionStep')
                  }

                  const allVideosCompleted = snapshot(
                    appProxy,
                  ).state?.videos?.every((v) => v.isProcessCompleted)
                  if (allVideosCompleted) {
                    clearDockProgress()
                  } else {
                    updateDockProgress()
                  }
                }
              }
            },
          )
      })()
    }

    return () => {
      compressionProgressRef.current?.()
      individualCompressionResultRef.current?.()
      clearDockProgress()
    }
  }, [batchId])

  return null
}

export default CompressionProgress
