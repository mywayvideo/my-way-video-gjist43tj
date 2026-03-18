import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ProductCard } from '@/components/ProductCard'

export function ReferencedProducts({ ids }: { ids: string[] }) {
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    if (!ids || ids.length === 0) {
      setProducts([])
      return
    }

    let isMounted = true

    supabase
      .from('products')
      .select('*, manufacturer:manufacturers(*)')
      .in('id', ids)
      .then(({ data }) => {
        if (isMounted && data) {
          setProducts(data)
        }
      })

    return () => {
      isMounted = false
    }
  }, [ids])

  if (products.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose mt-2">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
