import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, ProductFormData } from '@/types/product'
import { productService } from '@/services/productService'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

export function useProductForm() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [ncmSuggestions, setNcmSuggestions] = useState<any[]>([])
  const [isSuggestingNcm, setIsSuggestingNcm] = useState(false)

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      price_cost: 0,
      price_usa: 0,
      price_brl: 0,
      stock: 0,
      category_id: '',
      description: '',
      weight: 0,
      dimensions: '',
      image_url: '',
      ncm: '',
      is_special: false,
      technical_info: '',
      is_discontinued: false,
    },
  })

  useEffect(() => {
    productService
      .getCategories()
      .then(setCategories)
      .catch(() => toast({ description: 'Erro ao carregar categorias', variant: 'destructive' }))
      .finally(() => setIsLoadingCategories(false))
  }, [toast])

  const price_usa = form.watch('price_usa')
  const weight = form.watch('weight')

  useEffect(() => {
    const updateBrl = async () => {
      if (price_usa > 0 && weight > 0) {
        try {
          const brl = await productService.calculateBrl(price_usa, weight)
          form.setValue('price_brl', brl)
        } catch (e) {
          console.error('Failed to calculate BRL price', e)
        }
      }
    }
    const debounce = setTimeout(updateBrl, 800)
    return () => clearTimeout(debounce)
  }, [price_usa, weight, form])

  const handleExtractUrl = async (url: string) => {
    if (!url || !url.startsWith('http'))
      return toast({ description: 'URL inválida', variant: 'destructive' })
    setIsExtracting(true)
    try {
      const data = await productService.extractFromUrl(url)
      if (data.name) form.setValue('name', data.name)
      if (data.sku) form.setValue('sku', data.sku)
      if (data.description) form.setValue('description', data.description)
      if (data.technical_info) form.setValue('technical_info', data.technical_info)
      if (data.image_url) form.setValue('image_url', data.image_url)
      if (data.dimensions) form.setValue('dimensions', data.dimensions)
      if (data.category_id && categories.some((c) => c.id === data.category_id)) {
        form.setValue('category_id', data.category_id)
      }
      if (data.price_usa) form.setValue('price_usa', parseFloat(data.price_usa) || 0)
      if (data.price_cost) form.setValue('price_cost', parseFloat(data.price_cost) || 0)
      if (data.weight) form.setValue('weight', parseFloat(data.weight) || 0)
      if (data.stock) form.setValue('stock', parseInt(data.stock, 10) || 0)
      form.setValue('is_discontinued', data.is_discontinued === 'true')
      form.setValue('is_special', data.is_special === 'true')
      toast({ description: 'Dados extraídos com sucesso!' })
    } catch (err: any) {
      toast({ description: 'Não foi possível extrair dados', variant: 'destructive' })
    } finally {
      setIsExtracting(false)
    }
  }

  const handleSuggestNcm = async () => {
    const desc = form.getValues('description')
    if (!desc || desc.length < 10)
      return toast({ description: 'Insira uma descrição válida primeiro', variant: 'destructive' })
    setIsSuggestingNcm(true)
    try {
      const suggestions = await productService.suggestNcm(desc)
      setNcmSuggestions(suggestions)
    } catch (e) {
      toast({ description: 'Não foi possível sugerir NCM', variant: 'destructive' })
    } finally {
      setIsSuggestingNcm(false)
    }
  }

  const onSubmit = async (data: ProductFormData) => {
    setIsSaving(true)
    try {
      const exists = await productService.checkSkuExists(data.sku)
      if (exists) {
        form.setError('sku', { type: 'manual', message: 'Este SKU já existe' })
        setIsSaving(false)
        return
      }
      await productService.createProduct(data)
      toast({ description: 'Produto salvo com sucesso!' })
      setTimeout(() => navigate('/admin/catalog'), 2000)
    } catch (err) {
      toast({ description: 'Não foi possível salvar o produto', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  return {
    form,
    categories,
    isLoadingCategories,
    isExtracting,
    isSaving,
    handleExtractUrl,
    handleSuggestNcm,
    ncmSuggestions,
    setNcmSuggestions,
    isSuggestingNcm,
    onSubmit,
  }
}
