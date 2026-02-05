import ReactPlayer from 'react-player'

import { cn } from '@/utils/tailwind'

interface VideoPlayerProps {
  url: string
  className?: string
}

function VideoPlayer({ url, className }: VideoPlayerProps) {
  return (
    <div
      className={cn([
        'relative bg-black rounded-3xl border-primary border-4 overflow-hidden',
        className,
      ])}
    >
      <ReactPlayer
        src={url}
        controls
        width="100%"
        height="100%"
        className="aspect-video"
        style={{ aspectRatio: '16 / 9' }}
      />
    </div>
  )
}

export default VideoPlayer
