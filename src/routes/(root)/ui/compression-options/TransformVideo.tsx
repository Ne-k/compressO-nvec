import { useSnapshot } from 'valtio'

import Switch from '@/components/Switch'
import { appProxy } from '../../-state'

// Applies to single-video only
function TransformVideo() {
  const {
    state: { videos, isCompressing, isProcessCompleted },
  } = useSnapshot(appProxy)
  const video = videos.length > 0 ? videos[0] : null
  const { config } = video ?? {}
  const { shouldTransformVideo } = config ?? {}

  return (
    <>
      <Switch
        isSelected={shouldTransformVideo}
        onValueChange={() => {
          if (videos.length === 1) {
            appProxy.state.videos[0].config.shouldTransformVideo =
              !shouldTransformVideo
            if (shouldTransformVideo) {
              appProxy.state.videos[0].config.transformVideoConfig = undefined
            }
          }
        }}
        isDisabled={videos.length > 1 || isCompressing || isProcessCompleted}
      >
        <p className="text-gray-600 dark:text-gray-400 text-sm mr-2 w-full">
          Transform
        </p>
      </Switch>
    </>
  )
}

export default TransformVideo
