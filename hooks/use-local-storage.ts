"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * SSR-safe localStorage hook. Hydrates from storage on mount.
 * Storage key change triggers re-read across tabs (storage event).
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initialValue)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(key)
      if (raw != null) setValue(JSON.parse(raw) as T)
    } catch {
      // ignore; fall back to initial
    }
  }, [key])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handler = (e: StorageEvent) => {
      if (e.key !== key || e.newValue == null) return
      try {
        setValue(JSON.parse(e.newValue) as T)
      } catch {}
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [key])

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const out = typeof next === "function" ? (next as (p: T) => T)(prev) : next
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(key, JSON.stringify(out))
          }
        } catch {}
        return out
      })
    },
    [key],
  )

  return [value, update]
}
