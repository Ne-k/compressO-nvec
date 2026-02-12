import { TimelineState } from '@xzdarcy/react-timeline-editor'
import React, { useEffect } from 'react'

type UseEngineProps = {
  timelineState: React.RefObject<TimelineState>
  totalDuration: number
  onPlay?: () => void
  onPause?: () => void
  onSeek?: (time: number) => void
  onTimeChange?: (time: number) => void
  onEnd?: () => void
}

export type TimelineScales = {
  scale: number
  scaleWidth: number
  startLeft: number
}

function useTimelineEngine({
  timelineState,
  totalDuration,
  onPause,
  onPlay,
  onEnd,
  onSeek,
  onTimeChange,
}: UseEngineProps) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: <>
  useEffect(() => {
    if (!timelineState.current) return
    const engine = timelineState.current
    engine.listener.on('play', () => onPlay?.())
    engine.listener.on('paused', () => onPause?.())
    engine.listener.on('ended', () => onEnd?.())
    engine.listener.on('afterSetTime', ({ time }) => {
      onSeek?.(time)
      onTimeChange?.(time)
    })
    engine.listener.on('beforeSetTime', () => {
      timelineState.current?.pause()
    })
    engine.listener.on('setTimeByTick', ({ time }) => {
      onTimeChange?.(time)
    })

    return () => {
      if (!engine) return
      engine.pause()
      engine.listener.offAll()
    }
  }, [timelineState.current])

  const autoScrollCursorToCurrentTime = (scales: TimelineScales) => {
    if (!timelineState.current) return

    const { width } = timelineState.current.target.getBoundingClientRect()
    const currentTime = timelineState.current.getTime()
    const left =
      currentTime * (scales.scaleWidth / scales.scale) +
      scales.startLeft -
      width / 1.2
    timelineState.current.setScrollLeft(left)
  }

  const playOrPause = () => {
    if (!timelineState.current) return
    if (timelineState.current.isPlaying) {
      timelineState.current.pause()
    } else {
      if (timelineState.current.getTime() === totalDuration) {
        timelineState.current.setTime(0)
        timelineState.current.setScrollLeft(0)
      }
      timelineState.current.play({ autoEnd: false, toTime: totalDuration })
    }
  }

  const restart = () => {
    if (!timelineState.current) return
    timelineState.current.setTime(0)
  }

  const seekRightBy = (time: number) => {
    if (!time || !timelineState.current) return
    const next = timelineState.current.getTime() + time
    timelineState.current.setTime(next > totalDuration ? totalDuration : next)
  }

  const seekLeftBy = (time: number) => {
    if (!time || !timelineState.current) return
    const next = timelineState.current.getTime() - time
    timelineState.current.setTime(next < 0 ? 0 : next)
  }

  const setTime = (time: number) => {
    if (!timelineState.current) return
    timelineState.current.setTime(time)
  }

  const refreshTimeline = () => {
    if (!timelineState.current) return
    timelineState.current.reRender()
  }

  return {
    playOrPause,
    restart,
    seekLeftBy,
    seekRightBy,
    setTime,
    autoScrollCursorToCurrentTime,
    refreshTimeline,
  }
}

export default useTimelineEngine
