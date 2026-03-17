import { Checkbox } from '@heroui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect } from 'react'
import { useSnapshot } from 'valtio'

import Switch from '@/components/Switch'
import { AudioStream } from '@/types/compression'
import { slideDownTransition } from '@/utils/animation'
import { cn } from '@/utils/tailwind'
import { appProxy, normalizeBatchVideosConfig } from '../../-state'

type AudioTracksProps = {
  videoIndex: number
}

function getLanguageFromTags(
  tags: readonly (readonly [string, string])[] | null,
): string {
  if (!tags) return 'Unknown'
  const langTag = tags.find(([key]) => key.toLowerCase() === 'language')
  return langTag ? langTag[1] : '-'
}

function getTitleFromTags(
  tags: readonly (readonly [string, string])[] | null,
): string | null {
  if (!tags) return null
  const titleTag = tags.find(([key]) => key.toLowerCase() === 'title')
  return titleTag ? titleTag[1] : null
}

function AudioTracks({ videoIndex }: AudioTracksProps) {
  if (videoIndex < 0) return null

  const {
    state: {
      videos,
      isCompressing,
      isProcessCompleted,
      commonConfigForBatchCompression,
      isLoadingFiles,
    },
  } = useSnapshot(appProxy)
  const video = videos.length > 0 && videoIndex >= 0 ? videos[videoIndex] : null
  const { config, videoInfoRaw } = video ?? {}
  const { shouldEnableAudioTrackSelection, selectedAudioTracks, audioConfig } =
    config ?? commonConfigForBatchCompression ?? {}

  const audioStreams = videoInfoRaw?.audioStreams ?? []

  useEffect(() => {
    if (
      shouldEnableAudioTrackSelection &&
      (!selectedAudioTracks || selectedAudioTracks.length === 0)
    ) {
      const allTrackIndices = audioStreams.map((_, index) => index)
      if (videoIndex >= 0 && appProxy.state.videos[videoIndex]?.config) {
        appProxy.state.videos[videoIndex].config.selectedAudioTracks =
          allTrackIndices
      } else {
        if (appProxy.state.videos.length > 1) {
          appProxy.state.commonConfigForBatchCompression.selectedAudioTracks =
            allTrackIndices
          normalizeBatchVideosConfig()
        }
      }
    }
  }, [
    shouldEnableAudioTrackSelection,
    videoIndex,
    audioStreams,
    selectedAudioTracks,
  ])

  const handleSwitchToggle = useCallback(() => {
    if (videoIndex >= 0 && appProxy.state.videos[videoIndex]?.config) {
      appProxy.state.videos[videoIndex].config.shouldEnableAudioTrackSelection =
        !shouldEnableAudioTrackSelection
      appProxy.state.videos[videoIndex].isConfigDirty = true

      if (!shouldEnableAudioTrackSelection) {
        appProxy.state.videos[videoIndex].config.selectedAudioTracks =
          audioStreams.map((_, index) => index)
      } else {
        appProxy.state.videos[videoIndex].config.selectedAudioTracks = []
      }
    } else {
      if (appProxy.state.videos.length > 1) {
        appProxy.state.commonConfigForBatchCompression.shouldEnableAudioTrackSelection =
          !shouldEnableAudioTrackSelection
        if (!shouldEnableAudioTrackSelection) {
          appProxy.state.commonConfigForBatchCompression.selectedAudioTracks =
            audioStreams.map((_, index) => index)
        } else {
          appProxy.state.commonConfigForBatchCompression.selectedAudioTracks =
            []
        }
        normalizeBatchVideosConfig()
      }
    }
  }, [videoIndex, shouldEnableAudioTrackSelection, audioStreams])

  const handleTrackToggle = useCallback(
    (trackIndex: number) => {
      const currentSelected = selectedAudioTracks ?? []
      const isSelected = currentSelected.includes(trackIndex)

      let newSelected: number[]
      if (isSelected) {
        if (currentSelected.length <= 1) return
        newSelected = currentSelected.filter((i) => i !== trackIndex)
      } else {
        newSelected = [...currentSelected, trackIndex]
      }

      if (videoIndex >= 0 && appProxy.state.videos[videoIndex]?.config) {
        appProxy.state.videos[videoIndex].config.selectedAudioTracks =
          newSelected
        appProxy.state.videos[videoIndex].isConfigDirty = true
      } else {
        if (appProxy.state.videos.length > 1) {
          appProxy.state.commonConfigForBatchCompression.selectedAudioTracks =
            newSelected
          normalizeBatchVideosConfig()
        }
      }
    },
    [videoIndex, selectedAudioTracks],
  )

  const hasNoAudio = audioStreams.length === 0

  const shouldDisableInput =
    videos.length === 0 ||
    isCompressing ||
    isProcessCompleted ||
    isLoadingFiles ||
    hasNoAudio ||
    audioConfig?.volume === 0

  return (
    <>
      <Switch
        isSelected={shouldEnableAudioTrackSelection}
        onValueChange={handleSwitchToggle}
        isDisabled={shouldDisableInput || audioStreams.length === 0}
      >
        <p className="text-gray-600 dark:text-gray-400 text-sm mr-2 w-full font-bold">
          Tracks
        </p>
      </Switch>
      <AnimatePresence mode="wait">
        {shouldEnableAudioTrackSelection && audioStreams.length > 0 ? (
          <motion.div {...slideDownTransition} className="mt-1">
            <div className="w-full rounded-2xl overflow-hidden">
              {audioStreams.map((stream: AudioStream, index: number) => {
                const isSelected = (selectedAudioTracks ?? []).includes(index)
                const language = getLanguageFromTags(stream.tags)
                const title = getTitleFromTags(stream.tags)

                return (
                  <Checkbox
                    key={index}
                    isSelected={isSelected}
                    onValueChange={() => handleTrackToggle(index)}
                    isDisabled={
                      !shouldEnableAudioTrackSelection || shouldDisableInput
                    }
                    size="sm"
                    classNames={{
                      base: cn(
                        'inline-flex w-full max-w-md bg-content1',
                        'hover:bg-content2 items-center justify-start',
                        'cursor-pointer rounded-xl gap-2 p-4 py-2 pl-6 border-2 border-transparent',
                      ),
                      label: 'w-full',
                    }}
                    className="my-[2px]"
                  >
                    <div className="flex flex-col ml-2">
                      <span className="text-sm font-medium">
                        Track #{index + 1}
                        {title ? ` - ${title}` : ''}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {language ? `${language} • ` : ''}
                        {stream.codec.toUpperCase?.() ?? ''} • {stream.channels}{' '}
                        channels
                      </span>
                    </div>
                  </Checkbox>
                )
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

export default AudioTracks
