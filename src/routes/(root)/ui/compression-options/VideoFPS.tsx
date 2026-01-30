import { SelectItem } from '@heroui/select'
import { AnimatePresence, motion } from 'framer-motion'
import { useSnapshot } from 'valtio'

import Select from '@/components/Select'
import Switch from '@/components/Switch'
import { slideDownTransition } from '@/utils/animation'
import { appProxy } from '../../-state'

const FPS = [24, 25, 30, 50, 60] as const

function VideoFPS() {
  const {
    state: { videos, isCompressing, isProcessCompleted },
  } = useSnapshot(appProxy)
  const video = videos.length > 0 ? videos[0] : null
  const { config, fps } = video ?? {}
  const { shouldEnableCustomFPS, customFPS } = config ?? {}

  return (
    <>
      <Switch
        isSelected={shouldEnableCustomFPS}
        onValueChange={() => {
          if (appProxy.state.videos.length) {
            appProxy.state.videos[0].config.shouldEnableCustomFPS =
              !shouldEnableCustomFPS
          }
        }}
        isDisabled={videos.length === 0 || isCompressing || isProcessCompleted}
      >
        <p className="text-gray-600 dark:text-gray-400 text-sm mr-2 w-full">
          FPS
        </p>
      </Switch>
      <AnimatePresence mode="wait">
        {shouldEnableCustomFPS ? (
          <motion.div {...slideDownTransition}>
            <Select
              fullWidth
              label="Frames Per Second:"
              className="block flex-shrink-0 rounded-2xl !mt-8"
              selectedKeys={[String(customFPS ?? fps)!]}
              size="sm"
              value={String(customFPS ?? fps)}
              onChange={(evt) => {
                if (appProxy.state.videos.length) {
                  const value = evt?.target?.value
                  if (value && !Number.isNaN(+value)) {
                    appProxy.state.videos[0].config.customFPS = +value
                  }
                }
              }}
              selectionMode="single"
              isDisabled={
                videos.length === 0 || isCompressing || isProcessCompleted
              }
              classNames={{
                label: '!text-gray-600 dark:!text-gray-400 text-xs',
              }}
            >
              {FPS?.map((f) => (
                <SelectItem
                  key={String(f)}
                  value={String(f)}
                  className="flex justify-center items-center"
                >
                  {String(f)}
                </SelectItem>
              ))}
            </Select>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

export default VideoFPS
