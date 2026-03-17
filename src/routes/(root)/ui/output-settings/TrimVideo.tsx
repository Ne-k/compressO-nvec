import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import Icon from '@/components/Icon'
import Switch from '@/components/Switch'
import { appProxy } from '../../-state'

type TrimVideoProps = {
  videoIndex: number
}

function TrimVideo({ videoIndex }: TrimVideoProps) {
  if (videoIndex < 0) return

  const {
    state: { videos, isCompressing, isProcessCompleted, isLoadingFiles },
  } = useSnapshot(appProxy)
  const video = videos.length > 0 ? videos[videoIndex] : null
  const { config } = video ?? {}
  const { shouldTrimVideo, isVideoTrimEditMode } = config ?? {}

  const shouldDisableInput =
    videos.length === 0 || isCompressing || isProcessCompleted || isLoadingFiles

  return (
    <div className="w-full flex">
      <Switch
        isSelected={shouldTrimVideo}
        onValueChange={() => {
          if (appProxy.state.videos[videoIndex]?.config) {
            const currentConfig = appProxy.state.videos[videoIndex].config
            const newState = !shouldTrimVideo

            currentConfig.shouldTrimVideo = newState

            if (newState) {
              currentConfig.trimConfig = []
              currentConfig.isVideoTrimEditMode = true
            } else {
              currentConfig.trimConfig = undefined
              currentConfig.isVideoTrimEditMode = false
            }

            currentConfig.isVideoTransformEditMode = false
            appProxy.state.videos[videoIndex].isConfigDirty = true
          }
        }}
        isDisabled={shouldDisableInput}
      >
        <p className="text-gray-600 dark:text-gray-400 text-sm mr-2 w-full font-bold">
          Trim
        </p>
      </Switch>
      {shouldTrimVideo ? (
        isVideoTrimEditMode ? (
          <Button
            size="sm"
            color="success"
            onPress={() => {
              appProxy.state.videos[videoIndex].config.isVideoTrimEditMode =
                false
            }}
            className="h-[unset] py-1 ml-auto"
            isDisabled={shouldDisableInput}
          >
            Save
          </Button>
        ) : (
          <Button
            size="sm"
            onPress={() => {
              appProxy.state.videos[videoIndex].config.isVideoTrimEditMode =
                true
              appProxy.state.videos[
                videoIndex
              ].config.isVideoTransformEditMode = false
            }}
            className="h-[unset] py-1 ml-auto"
            isDisabled={shouldDisableInput}
          >
            <Icon name="pencil" size={16} /> Edit
          </Button>
        )
      ) : null}
    </div>
  )
}

export default TrimVideo
