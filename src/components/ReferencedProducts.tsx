import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ProductCard } from '@/components/ProductCard'

export function ReferencedProducts({ ids }: { ids: Array<string | Record<string, any>> }) {
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      setProducts([])
      return
    }

    let isMounted = true

    const firstItem = ids[0]
    const isObject = typeof firstItem === 'object' && firstItem !== null && 'id' in firstItem

    if (isObject) {
      const mixed = ids.some((item) => typeof item === 'string')
      if (mixed) {
        console.warn(
          'ReferencedProducts: Mixed types detected in ids array. Filtering valid items.',
        )
      }

      const validObjects = ids.filter(
        (item) => typeof item === 'object' && item !== null &