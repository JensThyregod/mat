import { useState, useCallback } from 'react'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable
  }
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => readJson(key, initialValue))

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = next instanceof Function ? next(prev) : next
        writeJson(key, resolved)
        return resolved
      })
    },
    [key],
  )

  const remove = useCallback(() => {
    setValue(initialValue)
    try {
      localStorage.removeItem(key)
    } catch {
      // Ignore
    }
  }, [key, initialValue])

  return [value, set, remove] as const
}
