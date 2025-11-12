import { useEffect, useRef } from 'react'

export function useTimeoutAfterSet<T>(
  timeout: number,
  callback: (val: T) => void,
) {
  const timeoutRef = useRef<number | null>(null)
  const valueRef = useRef<T | null>(null)

  useEffect(() => () => clearTimeout(timeoutRef.current!), [])

  return (val: T) => {
    valueRef.current = val
    clearTimeout(timeoutRef.current!)
    timeoutRef.current = window.setTimeout(() => {
      callback(valueRef.current!)
    }, timeout)
  }
}
