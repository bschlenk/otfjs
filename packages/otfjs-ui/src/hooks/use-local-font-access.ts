import { useEffect, useState } from 'react'

export interface LocalFontData {
  family: string
  fullName: string
  postscriptName: string
  style: string
  blob: () => Promise<Blob>
}

/**
 * Hook to check if the Local Font Access API is supported in the current browser
 */
export function useLocalFontAccessSupport(): boolean {
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported('queryLocalFonts' in window)
  }, [])

  return isSupported
}

/**
 * Hook to fetch local fonts using the Local Font Access API
 */
export function useLocalFonts() {
  const [fonts, setFonts] = useState<LocalFontData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchLocalFonts = async () => {
    if (!('queryLocalFonts' in window)) {
      setError(new Error('Local Font Access API not supported'))
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const availableFonts: FontData[] = await window.queryLocalFonts()
      
      setFonts(availableFonts)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch local fonts'))
    } finally {
      setLoading(false)
    }
  }

  return { fonts, loading, error, fetchLocalFonts }
}
