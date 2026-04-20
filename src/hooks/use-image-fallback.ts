import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null

  const trimmedUrl = url.trim()

  if (
    trimmedUrl.toLowerCase().startsWith('http://') ||
    trimmedUrl.toLowerCase().startsWith('https://') ||
    trimmedUrl.toLowerCase().startsWith('data:') ||
    trimmedUrl.toLowerCase().includes('bhphotovideo.com') ||
    trimmedUrl.toLowerCase().includes('static.bhphoto.com')
  ) {
    return trimmedUrl
  }

  if (url.startsWith('/')) {
    return url
  }

  // Assume it's a supabase storage path
  const { data } = supabase.storage.from('products').getPublicUrl(url)
  return data?.publicUrl || null
}

export function useImageFallback(initialUrl: string | null | undefined, fallbackUrl: string = '') {
  const [url, setUrl] = useState<string>(resolveImageUrl(initialUrl) || fallbackUrl)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setUrl(resolveImageUrl(initialUrl) || fallbackUrl)
    setHasError(false)
  }, [initialUrl, fallbackUrl])

  const handleError = () => {
    if (!hasError) {
      setUrl(fallbackUrl)
      setHasError(true)
    }
  }

  return { url, handleError, hasError }
}
