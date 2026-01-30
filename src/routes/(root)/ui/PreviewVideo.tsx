import { useSnapshot } from 'valtio'

import VideoTransformer from './compression-options/VideoTransformer'
import VideoThumbnail from './VideoThumbnail'
import { appProxy } from '../-state'

// TODO: Make it local for each video
function PreviewVideo() {
  const {
    state: { videos },
  } = useSnapshot(appProxy)
  const video = videos.length > 0 ? videos[0] : null
  const { config } = video ?? {}
  const { shouldTransformVideo } = config ?? {}

  return videos.length === 1 ? (
    <>{shouldTransformVideo ? <VideoTransformer /> : <VideoThumbnail />}</>
  ) : null
}

export default PreviewVideo
