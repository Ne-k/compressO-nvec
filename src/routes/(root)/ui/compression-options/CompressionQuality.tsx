import { AnimatePresence, motion } from 'framer-motion'
import React from 'react'
import { snapshot, useSnapshot } from 'valtio'

import Slider from '@/components/Slider/Slider'
import Switch from '@/components/Switch'
import { slideDownTransition } from '@/utils/animation'
import { appProxy } from '../../-state'

function CompressionQuality() {
  const {
    state: { isCompressing, isProcessCompleted, videos },
  } = useSnapshot(appProxy)
  const video = videos.length > 0 ? videos[0] : null
  const { config } = video ?? {}
  const { quality: compressionQuality, shouldEnableQuality } = config ?? {}

  const [quality, setQuality] = React.useState<number>(
    compressionQuality ?? 100,
  )
  const debounceRef = React.useRef<NodeJS.Timeout>()
  const qualityRef = React.useRef<number>(quality)

  React.useEffect(() => {
    qualityRef.current = quality
  }, [quality])

  React.useEffect(() => {
    const appSnapshot = snapshot(appProxy)
    if (
      appSnapshot.state.videos.length &&
      quality !== appSnapshot.state.videos[0]?.config?.quality
    ) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        if (appProxy.state.videos[0].config) {
          appProxy.state.videos[0].config.quality = quality
        }
      }, 500)
    }
    return () => {
      clearTimeout(debounceRef.current)
    }
  }, [quality])

  React.useEffect(() => {
    if (compressionQuality !== qualityRef.current) {
      if (
        typeof compressionQuality === 'number' &&
        !Number.isNaN(+compressionQuality)
      )
        setQuality(compressionQuality)
    }
  }, [compressionQuality])

  const handleQualityChange = React.useCallback((value: number | number[]) => {
    if (typeof value === 'number') {
      setQuality(value)
    }
  }, [])

  return (
    <>
      <Switch
        isSelected={shouldEnableQuality}
        onValueChange={() => {
          if (appProxy.state.videos.length) {
            appProxy.state.videos[0].config.shouldEnableQuality =
              !shouldEnableQuality
          }
        }}
        isDisabled={videos.length === 0 || isCompressing || isProcessCompleted}
      >
        <p className="text-gray-600 dark:text-gray-400 text-sm mr-2 w-full">
          Quality
        </p>
      </Switch>
      <AnimatePresence mode="wait">
        {shouldEnableQuality ? (
          <motion.div {...slideDownTransition}>
            <Slider
              label
              aria-label="Quality"
              size="sm"
              marks={[
                {
                  value: 0,
                  label: 'Low',
                },
                {
                  value: 50,
                  label: 'Medium',
                },
                {
                  value: 99,
                  label: 'High',
                },
              ]}
              className="mb-8"
              classNames={{ mark: 'text-xs' }}
              getValue={(value) => {
                const val = Array.isArray(value) ? value?.[0] : +value
                return val < 50
                  ? 'Low'
                  : val >= 50 && val < 100
                    ? 'Medium'
                    : 'High'
              }}
              renderValue={(props) => (
                <p className="text-primary text-sm font-bold">
                  {props?.children}
                </p>
              )}
              value={quality}
              onChange={handleQualityChange}
              isDisabled={
                isCompressing || isProcessCompleted || !shouldEnableQuality
              }
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

export default CompressionQuality
