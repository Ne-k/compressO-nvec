import { open } from '@tauri-apps/plugin-dialog'

import { extensions } from '@/types/compression'

type ChildrenFnParams = { onClick: () => void }

type Error = {
  message: string
  data?: any
}

type VideoPickerProps = {
  children: (_: ChildrenFnParams) => React.ReactNode
  onSuccess?: (_: { filePath: string | string[] }) => void
  onError?: (_: Error) => void
  multiple?: boolean
}

const videoExtensions = Object.keys(extensions?.video)

export default function VideoPicker({
  children,
  onSuccess,
  onError,
  multiple = false,
}: VideoPickerProps) {
  async function onClick() {
    try {
      const filePath = await open({
        directory: false,
        multiple,
        title: `Select video${multiple ? '(s)' : ''} to compress.`,
        filters: [{ name: 'video', extensions: videoExtensions }],
      })
      if (filePath == null) {
        const message = 'File selection config is invalid.'
        // biome-ignore lint/suspicious/noConsole: <>
        console.warn(message)
        onError?.({ message })
        return
      }
      onSuccess?.({ filePath })
    } catch (error: any) {
      onError?.({
        message: error?.message ?? 'Could not select a video.',
        data: error,
      })
    }
  }

  return children({ onClick })
}
