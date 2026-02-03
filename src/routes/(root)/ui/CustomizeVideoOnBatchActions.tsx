import { Button } from '@heroui/react'
import { motion } from 'framer-motion'
import { cloneDeep } from 'lodash'
import { useCallback } from 'react'
import { useSnapshot } from 'valtio'

import { zoomInTransition } from '@/utils/animation'
import PreviewSingleVideo from './PreviewSingleVideo'
import { appProxy } from '../-state'

function CustomizeVideoOnBatchActions() {
  const {
    state: { selectedVideoIndexForCustomization },
  } = useSnapshot(appProxy)

  const handleApplyVideoConfig = useCallback(() => {
    const selectedVideoIndexForCustomization =
      appProxy.state.selectedVideoIndexForCustomization
    if (selectedVideoIndexForCustomization >= 0) {
      appProxy.state.selectedVideoIndexForCustomization = -1

      if (
        appProxy.state.videos[selectedVideoIndexForCustomization]?.config
          ?.shouldTransformVideo &&
        appProxy.state.videos[selectedVideoIndexForCustomization].config
          ?.transformVideoConfig?.previewUrl
      ) {
        appProxy.state.videos[
          selectedVideoIndexForCustomization
        ].thumbnailPath =
          appProxy.state.videos[
            selectedVideoIndexForCustomization
          ]?.config?.transformVideoConfig?.previewUrl
      }
    }
  }, [])

  const handleResetVideoConfig = useCallback(() => {
    const selectedVideoIndexForCustomization =
      appProxy.state.selectedVideoIndexForCustomization
    if (selectedVideoIndexForCustomization >= 0) {
      if (appProxy.state.videos[selectedVideoIndexForCustomization]) {
        appProxy.state.videos[selectedVideoIndexForCustomization].config =
          cloneDeep(appProxy.state.commonConfigForBatchCompression)
        appProxy.state.videos[
          selectedVideoIndexForCustomization
        ].isConfigDirty = false
        appProxy.state.selectedVideoIndexForCustomization = -1
      }
    }
  }, [])

  return (
    <>
      <div className="absolute top-0 right-0 bottom-0 left-0 w-full h-full z-[10] flex flex-col justify-center items-center bg-white1 dark:bg-black1">
        <motion.div
          className="flex flex-col justify-center items-center"
          {...zoomInTransition}
        >
          <PreviewSingleVideo videoIndex={selectedVideoIndexForCustomization} />
        </motion.div>
        <div className="flex items-center gap-2 absolute top-4 right-4">
          <Button
            size="sm"
            onPress={handleResetVideoConfig}
            color="danger"
            variant="flat"
          >
            Reset
          </Button>
          <Button size="sm" variant="flat" onPress={handleApplyVideoConfig}>
            Apply
          </Button>
        </div>
      </div>
    </>
  )
}

export default CustomizeVideoOnBatchActions
