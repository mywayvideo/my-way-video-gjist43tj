import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export function resolveImageUrl(url?: string | null, bucket: string = 'products') {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(url)
  return data.publicUrl
}

export function useImageFallback(initialUrl?: string | null, bucket: string = 'products') {
  const [imgSrc, setImgSrc] = useState<string | null>(null)

  useEffect(() => {
    setImgSrc(resolveImageUrl(initialUrl, bucket))
  }, [initialUrl, bucket])

  return imgSrc
}
