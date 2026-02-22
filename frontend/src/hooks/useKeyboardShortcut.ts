import { useEffect } from 'react'

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === key) {
        callback()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [key, callback, enabled])
}
