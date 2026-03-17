import { SelectItem } from '@heroui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect } from 'react'
import { useSnapshot } from 'valtio'

import Select from '@/components/Select'
import Switch from '@/components/Switch'
import { extensions } from '@/types/compression'
import { slideDownTransition } from '@/utils/animation'
import { appProxy, normalizeBatchVideosConfig } from '../../-state'

type VideoExtension = keyof typeof extensions.video

type AudioCodecOption = {
  value: string
  name: string
  description: string
  compatible_containers: VideoExtension[]
}

const AUDIO_CODECS: readonly AudioCodecOption[] = [
  {
    value: 'aac',
    name: 'AAC',
    description: 'Standard codec, wide compatibility',
    compatible_containers: ['mp4', 'mov', 'mkv'] as VideoExtension[],
  },
  {
    value: 'libmp3lame',
    name: 'MP3',
    description: 'Universal audio format',
    compatible_containers: ['mp4', 'mov', 'mkv', 'avi'] as VideoExtension[],
  },
  {
    value: 'libopus',
    name: 'Opus',
    description: 'Modern, high quality',
    compatible_containers: ['webm', 'mkv'] as VideoExtension[],
  },
  {
    value: 'libvorbis',
    name: 'Vorbis',
    description: 'Open-source, good quality',
    compatible_containers: ['webm', 'mkv'] as VideoExtension[],
  },
  {
    value: 'ac3',
    name: 'AC3',
    description: 'Dolby Digital, surround sound',
    compatible_containers: ['mp4', 'mov', 'mkv', 'avi'] as VideoExtension[],
  },
  {
    value: 'alac',
    name: 'ALAC',
    description: 'Lossless compression optimized for Apple devices',
    compatible_containers: ['mp4', 'mov'] as VideoExtension[],
  },
  {
    value: 'flac',
    name: 'FLAC',
    description: 'Lossless compression',
    compatible_containers: ['mkv'] as VideoExtension[],
  },
  {
    value: 'pcm_s16le',
    name: 'PCM',
    description: 'Uncompressed, best quality',
    compatible_containers: ['mov', 'avi'] as VideoExtension[],
  },
]

type AudioCodecProps = {
  videoIndex: number
}

function AudioCodec({ videoIndex }: AudioCodecProps) {
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
  const {
    shouldEnableCustomAudioCodec,
    customAudioCodec,
    convertToExtension,
    audioConfig,
  } = config ?? commonConfigForBatchCompression ?? {}

  const currentExtension = convertToExtension ?? 'mp4'

  useEffect(() => {
    if (shouldEnableCustomAudioCodec && customAudioCodec) {
      const currentCodec = AUDIO_CODECS.find(
        (c) => c.value === customAudioCodec,
      )
      if (
        currentCodec &&
        !currentCodec.compatible_containers.includes(currentExtension)
      ) {
        // Codec is incompatible with current extension, reset it
        if (videoIndex >= 0 && appProxy.state.videos[videoIndex]?.config) {
          appProxy.state.videos[videoIndex].config.customAudioCodec = undefined
        } else {
          if (appProxy.state.videos.length > 1) {
            appProxy.state.commonConfigForBatchCompression.customAudioCodec =
              undefined
          }
        }
      }
    }
  }, [
    currentExtension,
    shouldEnableCustomAudioCodec,
    customAudioCodec,
    videoIndex,
  ])

  const handleSwitchToggle = useCallback(() => {
    if (videoIndex >= 0 && appProxy.state.videos[videoIndex]?.config) {
      appProxy.state.videos[videoIndex].config.shouldEnableCustomAudioCodec =
        !shouldEnableCustomAudioCodec
      appProxy.state.videos[videoIndex].isConfigDirty = true
    } else {
      if (appProxy.state.videos.length > 1) {
        appProxy.state.commonConfigForBatchCompression.shouldEnableCustomAudioCodec =
          !shouldEnableCustomAudioCodec
        normalizeBatchVideosConfig()
      }
    }
  }, [videoIndex, shouldEnableCustomAudioCodec])

  const handleValueChange = useCallback(
    (value: string) => {
      if (videoIndex >= 0 && appProxy.state.videos[videoIndex]?.config) {
        appProxy.state.videos[videoIndex].config.customAudioCodec = value
        appProxy.state.videos[videoIndex].isConfigDirty = true
      } else {
        if (appProxy.state.videos.length > 1) {
          appProxy.state.commonConfigForBatchCompression.customAudioCodec =
            value
          normalizeBatchVideosConfig()
        }
      }
    },
    [videoIndex],
  )

  const hasNoAudio = videoInfoRaw?.audioStreams?.length === 0

  const shouldDisableInput =
    videos.length === 0 ||
    isCompressing ||
    isProcessCompleted ||
    isLoadingFiles ||
    hasNoAudio ||
    audioConfig?.volume === 0

  const initialCodecValue = customAudioCodec ?? 'aac'

  const compatibleCodecs = AUDIO_CODECS.filter((codec) =>
    codec.compatible_containers.includes(currentExtension),
  )

  return (
    <>
      <Switch
        isSelected={shouldEnableCustomAudioCodec}
        onValueChange={handleSwitchToggle}
        isDisabled={shouldDisableInput}
      >
        <p className="text-gray-600 dark:text-gray-400 text-sm mr-2 w-full font-bold">
          Codec
        </p>
      </Switch>
      <AnimatePresence mode="wait">
        {shouldEnableCustomAudioCodec ? (
          <motion.div {...slideDownTransition}>
            <Select
              fullWidth
              label="Select Codec:"
              className="block flex-shrink-0 rounded-2xl !mt-8"
              selectedKeys={[initialCodecValue]}
              size="sm"
              value={initialCodecValue}
              onChange={(evt) => {
                const value = evt?.target?.value
                if (value) {
                  handleValueChange(value)
                }
              }}
              selectionMode="single"
              isDisabled={!shouldEnableCustomAudioCodec || shouldDisableInput}
              classNames={{
                label: '!text-gray-600 dark:!text-gray-400 text-xs',
              }}
            >
              {compatibleCodecs?.map((codec) => (
                <SelectItem
                  key={codec.value}
                  textValue={codec.name}
                  className="flex justify-center items-center"
                >
                  <div className="flex flex-col">
                    <span className="text-sm">{codec.name}</span>
                    <span className="text-xs text-gray-500">
                      {codec.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </Select>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

export default AudioCodec
