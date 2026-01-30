import { useSnapshot } from 'valtio'

import Switch from '@/components/Switch'
import { appProxy } from '../../-state'

function MuteAudio() {
  const {
    state: { videos, isCompressing, isProcessCompleted },
  } = useSnapshot(appProxy)
  const video = videos.length > 0 ? videos[0] : null
  const { config } = video ?? {}
  const { shouldMuteVideo } = config ?? {}

  return (
    <div className="flex items-center my-2">
      <Switch
        isSelected={shouldMuteVideo}
        onValueChange={() => {
          appProxy.state.videos[0].config.shouldMuteVideo = !shouldMuteVideo
        }}
        className="flex justify-center items-center"
        isDisabled={videos.length === 0 || isCompressing || isProcessCompleted}
      >
        <div className="flex justify-center items-center">
          <span className="text-gray-600 dark:text-gray-400 block mr-2 text-sm">
            Mute Audio
          </span>
        </div>
      </Switch>
    </div>
  )
}

export default MuteAudio
