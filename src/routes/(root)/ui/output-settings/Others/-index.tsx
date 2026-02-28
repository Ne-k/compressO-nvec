import Divider from '@/components/Divider'
import Metadata from './Metadata'
import Subtitles from './Subtitles'

type OthersProps = {
  videoIndex: number
}

function Others({ videoIndex }: OthersProps) {
  return (
    <div>
      <Subtitles videoIndex={videoIndex} />
      <Divider className="my-3" />
      <Metadata videoIndex={videoIndex} />
    </div>
  )
}

export default Others
