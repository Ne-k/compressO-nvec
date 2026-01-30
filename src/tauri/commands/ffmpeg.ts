import { core } from '@tauri-apps/api'

import {
  BatchCompressionResult,
  VideoInfo,
  VideoThumbnail,
  VideoTransformsHistory,
} from '@/types/compression'
import { FileMetadata } from '@/types/fs'

export function compressVideos({
  batchId,
  videos,
  convertToExtension,
  presetName,
  shouldMuteVideo = false,
  quality = 101,
  dimensions,
  fps,
  transformsHistory,
}: {
  batchId: string
  videos: { videoPath: string; videoId: string }[]
  convertToExtension?: string
  presetName?: string | null
  shouldMuteVideo?: boolean
  quality?: number
  dimensions?: readonly [number, number]
  fps?: string
  transformsHistory?: VideoTransformsHistory[]
}): Promise<BatchCompressionResult> {
  return core.invoke('compress_videos_batch', {
    batchId,
    videos,
    convertToExtension: convertToExtension ?? 'mp4',
    presetName,
    shouldMuteVideo,
    quality,
    fps,
    ...(dimensions
      ? { dimensions: [Math.round(dimensions[0]), Math.round(dimensions[1])] }
      : {}),
    transformsHistory,
  })
}

export function generateVideoThumbnail(
  videoPath: string,
): Promise<VideoThumbnail> {
  return core.invoke('generate_video_thumbnail', { videoPath })
}

export function getFileMetadata(filePath: string): Promise<FileMetadata> {
  return core.invoke('get_file_metadata', { filePath })
}

export function getVideoInfo(videoPath: string): Promise<VideoInfo | null> {
  return core.invoke('get_video_info', { videoPath })
}
