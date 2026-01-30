import { SelectItem } from '@heroui/select'
import { useSnapshot } from 'valtio'

import Select from '@/components/Select'
import { extensions } from '@/types/compression'
import { appProxy } from '../../-state'

const videoExtensions = Object.keys(extensions?.video)

function VideoExtension() {
  const {
    state: { videos, isCompressing, isProcessCompleted },
  } = useSnapshot(appProxy)
  const video = videos.length > 0 ? videos[0] : null
  const { config } = video ?? {}
  const { convertToExtension } = config ?? {}

  return (
    <Select
      fullWidth
      label="Extension:"
      className="block flex-shrink-0 rounded-2xl"
      size="sm"
      value={convertToExtension}
      selectedKeys={[convertToExtension!]}
      onChange={(evt) => {
        const value = evt?.target?.value as keyof typeof extensions.video
        if (value?.length > 0) {
          appProxy.state.videos[0].config.convertToExtension = value
        }
      }}
      selectionMode="single"
      isDisabled={videos.length === 0 || isCompressing || isProcessCompleted}
      classNames={{
        label: '!text-gray-600 dark:!text-gray-400 text-sm',
      }}
    >
      {videoExtensions?.map((ext) => (
        <SelectItem
          key={ext}
          value={ext}
          className="flex justify-center items-center"
        >
          {ext}
        </SelectItem>
      ))}
    </Select>
  )
}

export default VideoExtension
