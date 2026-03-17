import { SelectItem } from '@heroui/react'
import { open } from '@tauri-apps/plugin-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import Card from '@/components/Card'
import Icon from '@/components/Icon'
import Select from '@/components/Select'
import Switch from '@/components/Switch'
import {
  slideDownStaggerAnimation,
  slideDownTransition,
} from '@/utils/animation'
import { appProxy, normalizeBatchVideosConfig } from '../../../-state'

type SubtitlesProps = {
  videoIndex: number
}

const SUBTITLE_EXTENSIONS = ['srt']

const LANGUAGE_OPTIONS: { code: string; name: string }[] = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fre', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'ita', name: 'Italian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'rus', name: 'Russian' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
  { code: 'chi', name: 'Chinese' },
  { code: 'ara', name: 'Arabic' },
  { code: 'hin', name: 'Hindi' },
  { code: 'und', name: 'Unknown' },
]

function Subtitles({ videoIndex }: SubtitlesProps) {
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
  const { config } = video ?? {}
  const { subtitlesConfig, convertToExtension } =
    config ?? commonConfigForBatchCompression ?? {}

  const shouldDisableInput =
    videos.length === 0 || isCompressing || isProcessCompleted || isLoadingFiles

  const isDisabledForWebm = convertToExtension === 'webm'

  const subtitles = subtitlesConfig?.subtitles ?? []
  const shouldEnableSubtitles = subtitlesConfig?.shouldEnableSubtitles ?? false
  const preserveExistingSubtitles =
    subtitlesConfig?.preserveExistingSubtitles ?? false

  const handleToggleChange = useCallback(
    (isSelected: boolean) => {
      if (videoIndex >= 0 && appProxy.state.videos[videoIndex]?.config) {
        if (!appProxy.state.videos[videoIndex].config.subtitlesConfig) {
          appProxy.state.videos[videoIndex].config.subtitlesConfig = {
            subtitles: [],
            shouldEnableSubtitles: isSelected,
            preserveExistingSubtitles: false,
          }
        } else {
          appProxy.state.videos[videoIndex].config
            .subtitlesConfig!.shouldEnableSubtitles = isSelected
        }
        appProxy.state.videos[videoIndex].isConfigDirty = true
      } else {
        if (appProxy.state.videos.length > 1) {
          if (!appProxy.state.commonConfigForBatchCompression.subtitlesConfig) {
            appProxy.state.commonConfigForBatchCompression.subtitlesConfig = {
              subtitles: [],
              shouldEnableSubtitles: isSelected,
              preserveExistingSubtitles: false,
            }
          } else {
            appProxy.state.commonConfigForBatchCompression
              .subtitlesConfig!.shouldEnableSubtitles = isSelected
          }
          normalizeBatchVideosConfig()
        }
      }
    },
    [videoIndex],
  )

  const handlePreserveExistingChange = useCallback(
    (isSelected: boolean) => {
      if (videoIndex >= 0 && appProxy.state.videos[videoIndex]?.config) {
        if (!appProxy.state.videos[videoIndex].config.subtitlesConfig) {
          appProxy.state.videos[videoIndex].config.subtitlesConfig = {
            subtitles: [],
            shouldEnableSubtitles: true,
            preserveExistingSubtitles: isSelected,
          }
        } else {
          appProxy.state.videos[videoIndex].config
            .subtitlesConfig!.preserveExistingSubtitles = isSelected
        }
        appProxy.state.videos[videoIndex].isConfigDirty = true
      } else {
        if (appProxy.state.videos.length > 1) {
          if (!appProxy.state.commonConfigForBatchCompression.subtitlesConfig) {
            appProxy.state.commonConfigForBatchCompression.subtitlesConfig = {
              subtitles: [],
              shouldEnableSubtitles: true,
              preserveExistingSubtitles: isSelected,
            }
          } else {
            appProxy.state.commonConfigForBatchCompression
              .subtitlesConfig!.preserveExistingSubtitles = isSelected
          }
          normalizeBatchVideosConfig()
        }
      }
    },
    [videoIndex],
  )

  const handleAddSubtitle = useCallback(async () => {
    try {
      const filePath = await open({
        directory: false,
        multiple: false,
        title: 'Select subtitle file (SRT)',
        filters: [
          {
            name: 'subtitle',
            extensions: SUBTITLE_EXTENSIONS,
          },
        ],
      })
      if (typeof filePath === 'string') {
        const fileName = filePath.split(/[/\\]/).pop() ?? null
        const newSubtitle = {
          subtitlePath: filePath,
          language: 'eng',
          fileName,
        }

        if (videoIndex >= 0 && appProxy.state.videos[videoIndex]?.config) {
          if (!appProxy.state.videos[videoIndex].config.subtitlesConfig) {
            appProxy.state.videos[videoIndex].config.subtitlesConfig = {
              subtitles: [],
              shouldEnableSubtitles: true,
              preserveExistingSubtitles: false,
            }
          }
          appProxy.state.videos[
            videoIndex
          ].config.subtitlesConfig!.subtitles.push(newSubtitle)
          appProxy.state.videos[videoIndex].isConfigDirty = true
        } else {
          if (appProxy.state.videos.length > 1) {
            if (
              !appProxy.state.commonConfigForBatchCompression.subtitlesConfig
            ) {
              appProxy.state.commonConfigForBatchCompression.subtitlesConfig = {
                subtitles: [],
                shouldEnableSubtitles: true,
                preserveExistingSubtitles: false,
              }
            }
            appProxy.state.commonConfigForBatchCompression.subtitlesConfig!.subtitles.push(
              newSubtitle,
            )
            normalizeBatchVideosConfig()
          }
        }
      }
    } catch (error: any) {
      toast.error(error?.message ?? 'Could not select subtitle file.')
    }
  }, [videoIndex])

  const handleRemoveSubtitle = useCallback(
    (index: number) => {
      if (videoIndex >= 0 && appProxy.state.videos[videoIndex]?.config) {
        if (appProxy.state.videos[videoIndex].config.subtitlesConfig) {
          appProxy.state.videos[
            videoIndex
          ].config.subtitlesConfig!.subtitles.splice(index, 1)
          appProxy.state.videos[videoIndex].isConfigDirty = true
        }
      } else {
        if (appProxy.state.videos.length > 1) {
          if (appProxy.state.commonConfigForBatchCompression.subtitlesConfig) {
            appProxy.state.commonConfigForBatchCompression.subtitlesConfig!.subtitles.splice(
              index,
              1,
            )
            normalizeBatchVideosConfig()
          }
        }
      }
    },
    [videoIndex],
  )

  const handleLanguageChange = useCallback(
    (index: number, languageCode: string) => {
      const languageValue = languageCode === 'und' ? '' : languageCode

      if (videoIndex >= 0 && appProxy.state.videos[videoIndex]?.config) {
        if (appProxy.state.videos[videoIndex].config.subtitlesConfig) {
          appProxy.state.videos[videoIndex].config.subtitlesConfig!.subtitles[
            index
          ].language = languageValue
          appProxy.state.videos[videoIndex].isConfigDirty = true
        }
      } else {
        if (appProxy.state.videos.length > 1) {
          if (appProxy.state.commonConfigForBatchCompression.subtitlesConfig) {
            appProxy.state.commonConfigForBatchCompression
              .subtitlesConfig!.subtitles[index].language = languageValue
            normalizeBatchVideosConfig()
          }
        }
      }
    },
    [videoIndex],
  )

  const getDisplayLanguageCode = (code: string) => {
    return code === '' ? 'und' : code
  }

  return (
    <>
      <div>
        <div className="flex items-center">
          <Switch
            isSelected={shouldEnableSubtitles}
            onValueChange={handleToggleChange}
            className="flex justify-center items-center"
            isDisabled={shouldDisableInput}
            size="sm"
          >
            <div className="flex justify-center items-center">
              <span className="text-gray-600 dark:text-gray-400 block mr-2 text-sm font-bold">
                Subtitles
              </span>
            </div>
          </Switch>
        </div>
        {shouldEnableSubtitles ? (
          <Card className="px-2 my-2 pb-4 shadow-none border-1 dark:border-none">
            <motion.div {...slideDownTransition} className="mt-2">
              <div className="flex items-center gap-2 mb-3">
                <Switch
                  isSelected={preserveExistingSubtitles}
                  onValueChange={handlePreserveExistingChange}
                  isDisabled={shouldDisableInput}
                  size="sm"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Preserve existing subtitles
                  </span>
                </Switch>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  variants={slideDownStaggerAnimation.container}
                  initial="hidden"
                  animate="show"
                  exit="hidden"
                >
                  {subtitles.map((subtitle, index) => (
                    <motion.div
                      key={`${subtitle.subtitlePath}-${index}`}
                      layout
                      variants={slideDownStaggerAnimation.item}
                      className="mb-2 p-3 bg-default-50 rounded-xl border border-default-200 dark:border-default-100"
                    >
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate mb-2 text-center">
                        {subtitle.fileName || `Subtitle ${index + 1}`}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <div className="flex-1 min-w-0">
                          <Select
                            fullWidth
                            label="Language"
                            size="sm"
                            selectedKeys={[
                              getDisplayLanguageCode(
                                subtitle.language ?? 'eng',
                              ),
                            ]}
                            value={getDisplayLanguageCode(
                              subtitle.language ?? 'eng',
                            )}
                            onChange={(evt) => {
                              const value = evt?.target?.value
                              if (value) {
                                handleLanguageChange(index, value)
                              }
                            }}
                            selectionMode="single"
                            isDisabled={shouldDisableInput || isDisabledForWebm}
                            classNames={{
                              label:
                                '!text-gray-600 dark:!text-gray-400 text-xs',
                              mainWrapper: 'flex-1',
                            }}
                          >
                            {LANGUAGE_OPTIONS.map((lang) => (
                              <SelectItem key={lang.code} textValue={lang.name}>
                                {lang.name}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>
                        <Button
                          type="button"
                          onPress={() => handleRemoveSubtitle(index)}
                          size="sm"
                          isDisabled={shouldDisableInput || isDisabledForWebm}
                          color="danger"
                          isIconOnly
                          className="self-end"
                        >
                          <Icon name="cross" size={20} />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>

              <Button
                type="button"
                onPress={handleAddSubtitle}
                fullWidth
                size="sm"
                isDisabled={shouldDisableInput || isDisabledForWebm}
                className="mt-2"
              >
                Add Subtitle Track
                <Icon name="fileExplorer" size={14} />
              </Button>

              {isDisabledForWebm ? (
                <p className="text-xs italic text-danger-300 mt-2">
                  webm does not support soft subtitles
                </p>
              ) : null}
            </motion.div>
          </Card>
        ) : null}
      </div>
    </>
  )
}

export default Subtitles
