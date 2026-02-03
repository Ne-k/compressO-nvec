import { core } from '@tauri-apps/api'

import {
  BatchCompressionResult,
  VideoCompressionConfig,
  VideoInfo,
  VideoThumbnail,
} from '@/types/compression'
import { FileMetadata } from '@/types/fs'

export function compressVideos(
  batchId: string,
  videos: VideoCompressionConfig[],
): Promise<BatchCompressionResult> {
  return core.invoke('compress_videos_batch', {
    batchId,
    videos,
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
