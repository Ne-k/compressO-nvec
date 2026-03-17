import { core } from '@tauri-apps/api'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import Icon from '@/components/Icon'
import Switch from '@/components/Switch'
import { appProxy } from '../../-state'

type TransformVideoProps = {
  videoIndex: number
}

function TransformVideo({ videoIndex }: TransformVideoProps) {
  if (videoIndex < 0) return

  const {
    state: { videos, isCompressing, isProcessCompleted, isLoadingFiles },
  } = useSnapshot(appProxy)
  const video = videos.length > 0 ? videos[videoIndex] : null
  const { config } = video ?? {}
  const { shouldTransformVideo, isVideoTransformEditMode } = config ?? {}

  const shouldDisableInput =
    videos.length === 0 || isCompressing || isProcessCompleted || isLoadingFiles

  return (
    <div className="w-full flex">
      <Switch
        isSelected={shouldTransformVideo}
        onValueChange={() => {
          if (appProxy.state.videos[videoIndex]?.config) {
            appProxy.state.videos[videoIndex].config.shouldTransformVideo =
              !shouldTransformVideo
            appProxy.state.videos[videoIndex].config.isVideoTransformEditMode =
              !shouldTransformVideo
            appProxy.state.videos[videoIndex].config.isVideoTrimEditMode = false
            appProxy.state.videos[videoIndex].isConfigDirty = true

            if (shouldTransformVideo) {
              appProxy.state.videos[videoIndex].config.transformVideoConfig =
                undefined
              appProxy.state.videos[videoIndex].thumbnailPath =
                core.convertFileSrc(
                  appProxy.state.videos[videoIndex].thumbnailPathRaw!,
                )
            }
          }
        }}
        isDisabled={shouldDisableInput}
      >
        <p className="text-gray-600 dark:text-gray-400 text-sm mr-2 w-full font-bold">
          Transform
        </p>
      </Switch>
      {shouldTransformVideo ? (
        isVideoTransformEditMode ? (
          <Button
            size="sm"
            color="success"
            onPress={() => {
              appProxy.state.videos[
                videoIndex
              ].config.isVideoTransformEditMode = false
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
              appProxy.state.videos[
                videoIndex
              ].config.isVideoTransformEditMode = true
              appProxy.state.videos[videoIndex].config.isVideoTrimEditMode =
                false
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

export default TransformVideo
