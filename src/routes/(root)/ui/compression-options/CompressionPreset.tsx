import { SelectItem } from '@heroui/select'
import { AnimatePresence, motion } from 'framer-motion'
import { useSnapshot } from 'valtio'

import Icon from '@/components/Icon'
import Select from '@/components/Select'
import Switch from '@/components/Switch'
import Tooltip from '@/components/Tooltip'
import { compressionPresets } from '@/types/compression'
import { slideDownTransition } from '@/utils/animation'
import { appProxy } from '../../-state'

const presets = Object.keys(compressionPresets)

function CompressionPreset() {
  const {
    state: { isCompressing, isProcessCompleted, videos },
  } = useSnapshot(appProxy)
  const video = videos.length > 0 ? videos[0] : null
  const { config } = video ?? {}
  const { presetName, shouldDisableCompression } = config ?? {}

  return (
    <>
      <>
        <div className="flex items-center mb-4 my-2">
          <Switch
            disabled={videos.length === 0}
            isSelected={!shouldDisableCompression}
            onValueChange={() => {
              if (appProxy.state.videos.length) {
                appProxy.state.videos[0].config.shouldDisableCompression =
                  !shouldDisableCompression
              }
            }}
            className="flex justify-center items-center"
            isDisabled={isCompressing || isProcessCompleted}
          >
            <div className="flex justify-center items-center">
              <span className="text-gray-600 dark:text-gray-400 block mr-2 text-sm">
                Compress
              </span>
            </div>
          </Switch>
        </div>
      </>
      <AnimatePresence mode="wait">
        {!shouldDisableCompression ? (
          <motion.div {...slideDownTransition} className="mt-2">
            <div className="mt-8">
              <Select
                fullWidth
                label="Compression Preset:"
                labelPlacement="outside"
                className="block flex-shrink-0 rounded-2xl"
                selectedKeys={[presetName!]}
                onChange={(evt) => {
                  if (appProxy.state.videos.length) {
                    const value = evt?.target
                      ?.value as keyof typeof compressionPresets
                    if (value?.length > 0) {
                      appProxy.state.videos[0].config.presetName = value
                    }
                  }
                }}
                selectionMode="single"
                isDisabled={
                  videos.length === 0 ||
                  shouldDisableCompression ||
                  isCompressing ||
                  isProcessCompleted
                }
                classNames={{
                  label: '!text-gray-600 dark:!text-gray-400 text-xs',
                }}
              >
                {presets?.map((preset) => (
                  // Right now if we use SelectItem it breaks the code so opting for SelectItem from NextUI directly
                  <SelectItem
                    key={preset}
                    value={preset}
                    className="flex justify-center items-center"
                    endContent={
                      preset === compressionPresets.ironclad ? (
                        <Tooltip content="Recommended" aria-label="Recommended">
                          <Icon
                            name="star"
                            className="inline-block ml-1 text-yellow-500"
                            size={15}
                          />
                        </Tooltip>
                      ) : null
                    }
                  >
                    {preset}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

export default CompressionPreset
