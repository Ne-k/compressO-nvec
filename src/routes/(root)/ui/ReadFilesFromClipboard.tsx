import { useEffect } from 'react'

import { readFilesFromClipboard } from '@/tauri/commands/fs'

type ReadFilesFromClipboardProps = {
  onFiles: (files: string[]) => void
}

function ReadFilesFromClipboard({ onFiles }: ReadFilesFromClipboardProps) {
  useEffect(() => {
    function handleReadFilesFromClipboard() {
      readFilesFromClipboard()
        .then((files: string[]) => {
          if (Array.isArray(files)) {
            onFiles?.(files)
          }
        })
        .catch(() => {
          //ignore
        })
    }

    window.addEventListener('paste', handleReadFilesFromClipboard)

    return () => {
      window.removeEventListener('paste', handleReadFilesFromClipboard)
    }
  }, [onFiles])

  return null
}

export default ReadFilesFromClipboard
