import React, { createContext, useContext, useState, ReactNode } from 'react'
import { MOCK_PRODUCTS, Product } from '@/lib/mockData'
import { toast } from '@/hooks/use-toast'

interface ProductStore {
  products: Product[]
  addProduct: (product: Omit<Product, 'id'>) => void
  updateProduct: (id: string, product: Partial<Product>) => void
  deleteProduct: (id: string) => void
}

const ProductContext = createContext<ProductStore | undefined>(undefined)

export function ProductProvider({ children }: { children: ReactNode }) {
  // Simulating Skip Cloud Real-Time Database connection
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS)

  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct = { ...product, id: `db_${Math.random().toString(36).substr(2, 9)}` }
    setProducts((prev) => [...prev, newProduct])
    toast({
      title: 'Sincronizado: Produto Adicionado',
      description: 'O catálogo foi atualizado em tempo real.',
    })
  }

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
    toast({
      title: 'Sincronizado: Produto Atualizado',
      description: 'As alterações já refletem no site e no Agente de IA.',
    })
  }

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id))
    toast({
      title: 'Sincronizado: Produto Removido',
      variant: 'destructive',
      description: 'O item foi removido do banco de dados.',
    })
  }

  return React.createElement(
    ProductContext.Provider,
    { value: { products, addProduct, updateProduct, deleteProduct } },
    children,
  )
}

export function useProductStore() {
  const context = useContext(ProductContext)
  if (context === undefined) {
    throw new Error('useProductStore must be used within a ProductProvider')
  }
  return context
}
