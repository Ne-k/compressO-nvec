import { useSnapshot } from 'valtio'

import Image from '@/components/Image'
import { appProxy } from '../-state'

// Adjust to all videos
function VideoThumbnail() {
  const {
    state: { videos },
  } = useSnapshot(appProxy)
  const video = videos.length > 0 ? videos[0] : null
  const { thumbnailPath } = video ?? {}

  return (
    <Image
      alt="video to compress"
      src={thumbnailPath as string}
      className="max-w-[65vw] xxl:max-w-[75vw] max-h-[60vh] object-contain rounded-3xl border-primary border-4"
    />
  )
}

export default VideoThumbnail
