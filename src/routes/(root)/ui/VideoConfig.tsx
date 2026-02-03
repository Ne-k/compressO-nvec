import { AnimatePresence, motion } from 'framer-motion'
import React from 'react'
import { useSnapshot } from 'valtio'

import Layout from '@/components/Layout'
import { zoomInTransition } from '@/utils/animation'
import { cn } from '@/utils/tailwind'
import CompressionProgress from './CompressionProgress'
import CustomizeVideoOnBatchActions from './CustomizeVideoOnBatchActions'
import OutputSettings from './output-settings/-index'
import PreviewBatchVideos from './PreviewBatchVideos'
import PreviewSingleVideo from './PreviewSingleVideo'
import styles from './styles.module.css'
import { appProxy } from '../-state'

function VideoConfig() {
  const {
    state: { videos, isCompressing, selectedVideoIndexForCustomization },
  } = useSnapshot(appProxy)

  return (
    <Layout
      childrenProps={{
        className: 'h-full',
      }}
      hideLogo
    >
      <div className={cn(['h-full p-6', styles.videoConfigContainer])}>
        <section
          className={cn(
            'relative px-4 py-6 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 overflow-hidden',
            videos.length === 1
              ? 'flex flex-col justify-center items-center'
              : '',
          )}
        >
          <AnimatePresence>
            {videos.length > 1 ? (
              <>
                <PreviewBatchVideos />
                {selectedVideoIndexForCustomization > -1 ? (
                  <CustomizeVideoOnBatchActions />
                ) : null}
              </>
            ) : (
              <motion.div
                className="flex flex-col justify-center items-center"
                {...zoomInTransition}
              >
                <PreviewSingleVideo videoIndex={0} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
        <OutputSettings
          videoIndex={
            videos.length === 1 ? 0 : selectedVideoIndexForCustomization
          }
        />
      </div>
      {isCompressing ? <CompressionProgress /> : null}
    </Layout>
  )
}

export default React.memo(VideoConfig)
