import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import ReactPlayer from 'react-player'
import { BaseReactPlayerProps } from 'react-player/base'
import { ClassNameValue } from 'tailwind-merge'

import { cn } from '@/utils/tailwind'
import Button from '../Button'
import Icon from '../Icon'

/**
 * react-player v3 is better type-safety but is feature incomplete with v2.
 * v2 does not have good type-safety so we'll implement the types ourselves based on the usage
 */

export interface VideoPlayerRef {
  playerRef: ReactPlayer | null
  getInternalPlayer: () => HTMLVideoElement | null
  togglePlayPause: () => void
  playVideo: () => void
  pauseVideo: () => void
  getPlaybackState: () => 'playing' | 'paused'
  captureVideoFrame: () => Promise<string | null>
}

export interface VideoPlayerProps extends BaseReactPlayerProps {
  playPauseOnSpaceKeydown?: boolean
  containerClassName?: ClassNameValue
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  ({ playPauseOnSpaceKeydown, containerClassName, ...props }, forwardedRef) => {
    const [isPlaying, setIsPlaying] = useState(false)

    const playerRef = useRef<ReactPlayer | null>(null)
    const playPauseButtonRef = useRef<HTMLButtonElement | null>(null)
    const lastCapturedVideoFrame = useRef<string | null>(null)

    const togglePlayPause = useCallback(() => {
      setIsPlaying((s) => !s)
    }, [])

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        const target = e.target as HTMLElement
        const isInputField =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target.isContentEditable

        if (e.code === 'Space' && !isInputField) {
          e.preventDefault()
          togglePlayPause()
        }
      },
      [togglePlayPause],
    )

    const captureVideoFrame = useCallback(async () => {
      if (!playerRef.current) return null

      const canvas = document.createElement('canvas')

      const internalPlayer = playerRef.current.getInternalPlayer()
      canvas.width = internalPlayer.videoWidth
      canvas.height = internalPlayer.videoHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      ctx.drawImage(
        playerRef.current.getInternalPlayer() as HTMLVideoElement,
        0,
        0,
        canvas.width,
        canvas.height,
      )

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      )

      if (!blob) {
        return null
      }

      if (lastCapturedVideoFrame.current) {
        URL.revokeObjectURL(lastCapturedVideoFrame.current)
      }

      const videoFrameUrl = URL.createObjectURL(blob)

      lastCapturedVideoFrame.current = videoFrameUrl

      return videoFrameUrl
    }, [])

    useImperativeHandle(
      forwardedRef,
      () =>
        ({
          playerRef: playerRef.current,
          getInternalPlayer: () => {
            return playerRef.current?.getInternalPlayer() as any
          },
          togglePlayPause: togglePlayPause,
          playVideo: () => {
            setIsPlaying(true)
          },
          pauseVideo: () => {
            setIsPlaying(false)
          },
          getPlaybackState() {
            return isPlaying ? 'playing' : 'paused'
          },
          captureVideoFrame,
        }) satisfies VideoPlayerRef,
    )

    useEffect(() => {
      if (playPauseOnSpaceKeydown) {
        window.addEventListener('keydown', handleKeyDown)
      } else {
        window.removeEventListener('keydown', handleKeyDown)
      }
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
      }
    }, [handleKeyDown, playPauseOnSpaceKeydown])

    useEffect(() => {
      if (playPauseButtonRef.current) {
        playPauseButtonRef.current.focus()
      }
    }, [])

    return (
      <div
        className={cn('relative w-full h-full', containerClassName)}
        role="button"
        onClick={togglePlayPause}
      >
        <ReactPlayer
          ref={playerRef}
          controls
          width="100%"
          height="100%"
          playing={isPlaying}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          {...props}
        />
        <Button
          ref={playPauseButtonRef}
          onPress={togglePlayPause}
          isIconOnly
          radius="full"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-/12  bg-black/30 hover:bg-black/40 transition-colors cursor-pointer"
        >
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={28}
            className="text-white drop-shadow-lg"
          />
        </Button>
      </div>
    )
  },
)

export default VideoPlayer
