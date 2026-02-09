import {
  Timeline,
  TimelineEditor,
  TimelineState,
} from '@xzdarcy/react-timeline-editor'
import {
  TimelineAction,
  TimelineEffect,
  TimelineRow,
} from '@xzdarcy/timeline-engine'
import { FC, ForwardedRef, forwardRef, useState } from 'react'

export const rowIds = {
  videoBoundary: 'video-boundary',
  videoTrim: 'video-trim',
} as const

const effects = {
  effectVideoBoundary: {
    id: rowIds.videoBoundary,
  },
  effectVideoTrim: {
    id: rowIds.videoTrim,
  },
} satisfies Record<string, TimelineEffect>

const getDefaultEditorData = ({
  duration,
  startDuration,
  endDuration,
}: {
  duration: number
  startDuration?: number
  endDuration?: number
}): TimelineRow[] => {
  return [
    {
      id: rowIds.videoBoundary,
      actions: [
        {
          id: 'action0',
          start: 0,
          minStart: 0,
          end: duration,
          maxEnd: duration,
          effectId: effects.effectVideoBoundary.id,
          movable: false,
          disable: true,
          flexible: false,
        },
      ],
    },
    {
      id: rowIds.videoTrim,
      actions: [
        {
          id: 'action1',
          start: startDuration ?? 0,
          minStart: 0,
          end: endDuration ?? duration,
          maxEnd: duration,
          effectId: effects.effectVideoTrim.id,
          movable: false,
        },
      ],
    },
  ]
}

export const scales = {
  scale: 1,
  scaleWidth: 50,
  startLeft: 20,
} as const

export const TrimRow: FC<{
  action: TimelineAction
  row: TimelineRow
}> = ({ action }) => {
  return (
    <div className="flex justify-center items-center bg-primary h-8 rounded-lg">
      <div className="text-center text-white1">{`${(
        action.end - action.start
      ).toFixed(2)}s`}</div>
    </div>
  )
}

export const BoundaryRow: FC<{
  action: TimelineAction
  row: TimelineRow
}> = ({ action }) => {
  return (
    <div className="flex justify-center items-center bg-primary h-[2px] mt-3 rounded-lg">
      <p className="text-center text-white1">{`${(
        action.end - action.start
      ).toFixed(2)}s`}</p>
    </div>
  )
}

export interface VideoTrimmerTimelineProps
  extends Omit<TimelineEditor, 'editorData' | 'effects'> {
  id: string
  duration: number
  startDuration?: number
  endDuration?: number
}

export interface VideoTrimmerTimelineRef extends TimelineState {}

const VideoTrimmerTimeline = forwardRef(
  (
    {
      id,
      duration,
      startDuration,
      endDuration,
      style,
      ...props
    }: VideoTrimmerTimelineProps,
    forwardedRef: ForwardedRef<VideoTrimmerTimelineRef>,
  ) => {
    const [editorData, setEditorData] = useState<TimelineRow[]>(() =>
      getDefaultEditorData({ duration, startDuration, endDuration }),
    )

    return (
      <Timeline
        key={id}
        ref={forwardedRef}
        editorData={editorData}
        effects={effects}
        onChange={setEditorData}
        autoScroll
        scaleWidth={scales.scaleWidth}
        scale={scales.scale}
        startLeft={scales.startLeft}
        style={{
          width: '100%',
          height: '125px',
          borderRadius: '10px',
          ...(style ?? {}),
        }}
        getActionRender={(action, row) => {
          if (action.effectId === effects.effectVideoBoundary.id) {
            return <BoundaryRow action={action} row={row} />
          } else if (action.effectId === effects.effectVideoTrim.id) {
            return <TrimRow action={action} row={row} />
          }
        }}
        {...props}
      />
    )
  },
)

export default VideoTrimmerTimeline
