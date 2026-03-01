export const runtime = {
  isTauri:
    typeof window !== 'undefined' &&
    typeof (window as any).__TAURI_INTERNALS__ !== 'undefined',
  isServerMode:
    import.meta.env.VITE_SERVER_MODE === 'true' ||
    (typeof window !== 'undefined' &&
      typeof (window as any).__TAURI_INTERNALS__ === 'undefined'),
  apiBase: import.meta.env.VITE_SERVER_API || '',
}
