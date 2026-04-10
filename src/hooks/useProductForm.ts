import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ProductFormData } from '@/types/product'
import { productService } from '@/services/productService'
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  sku: z.string().min(1, 'SKU é obrigatório'),
  manufacturer_id: z.string().min(1, 'Fabricante é obrigatório').catch('').default(''),
  price_cost: z.coerce.number().catch(0).default(0),
  price_usa: z.coerce.number().catch(0).default(0),
  price_brl: z.coerce.number().catch(0).default(0),
  stock: z.coerce.number().catch(0).default(0),
  category_id: z.string().catch('').default(''),
  description: z.string().catch('').default(''),
  weight: z.coerce.number().catch(0).default(0),
  dimensions: z.string().catch('').default(''),
  image_url: z.string().catch('').default(''),
  ncm: z.string().catch('').default(''),
  is_special: z.boolean().catch(false).default(false),
  technical_info: z.string().catch('').default(''),
  is_discontinued: z.boolean().catch(false).default(false),
})
import { useToast } from '@/hooks/use-toast'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'

export function useProductForm() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [categories, setCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingProduct, setIsLoadingProduct] = useState(!!id)
  const [ncmSuggestions, setNcmSuggestions] = useState<any[]>([])
  const [isSuggestingNcm, setIsSuggestingNcm] = useState(false)

  const isEditMode = !!id

  const form = useForm<any>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      manufacturer_id: '',
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

  const loadCategories = async () => {
    try {
      const cats = await productService.getCategories()
      setCategories(cats)
    } catch {
      toast({ description: 'Erro ao carregar categorias', variant: 'destructive' })
    } finally {
      setIsLoadingCategories(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [toast])

  useEffect(() => {
    if (id) {
      const loadProduct = async () => {
        setIsLoadingProduct(true)
        try {
          const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
          if (error) throw error
          if (data) {
            form.reset({
              name: data.name || '',
              sku: data.sku || '',
              manufacturer_id: data.manufacturer_id || '',
              price_cost: data.price_cost || 0,
              price_usa: data.price_usd || 0,
              price_brl: data.price_brl || 0,
              stock: data.stock || 0,
              category_id: data.category_id || '',
              description: data.description || '',
              weight: data.weight || 0,
              dimensions: data.dimensions || '',
              image_url: data.image_url || '',
              ncm: data.ncm || '',
              is_special: data.is_special || false,
              technical_info: data.technical_info || '',
              is_discontinued: data.is_discontinued || false,
            })
          }
        } catch (e) {
          toast({ description: 'Erro ao carregar produto', variant: 'destructive' })
          navigate('/admin/catalog')
        } finally {
          setIsLoadingProduct(false)
        }
      }
      loadProduct()
    }
  }, [id, form, navigate, toast])

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
      if (data.error) {
        throw new Error(data.error)
      }
      if (data.name) form.setValue('name', data.name)
      if (data.sku) form.setValue('sku', data.sku)
      if (data.description) form.setValue('description', data.description)
      if (data.technical_info) form.setValue('technical_info', data.technical_info)
      if (data.image_url) form.setValue('image_url', data.image_url)
      if (data.dimensions) form.setValue('dimensions', data.dimensions)
      if (data.category_id && categories.some((c) => c.id === data.category_id)) {
        form.setValue('category_id', data.category_id)
      }
      if (data.manufacturer_id) form.setValue('manufacturer_id', data.manufacturer_id)
      if (data.price_usa) form.setValue('price_usa', parseFloat(data.price_usa) || 0)
      if (data.price_cost) form.setValue('price_cost', parseFloat(data.price_cost) || 0)
      if (data.weight) form.setValue('weight', parseFloat(data.weight) || 0)
      if (data.stock) form.setValue('stock', parseInt(data.stock, 10) || 0)
      form.setValue('is_discontinued', data.is_discontinued === 'true')
      form.setValue('is_special', data.is_special === 'true')
      toast({ description: 'Dados extraídos com sucesso!' })
    } catch (err: any) {
      toast({
        description: err.message || 'Não foi possível extrair dados da URL fornecida.',
        variant: 'destructive',
      })
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

  const handleAddCategory = async (name: string) => {
    try {
      const { data, error } = await supabase.from('categories').insert({ name }).select().single()
      if (error) throw error
      await loadCategories()
      form.setValue('category_id', data.id)
      toast({ description: 'Categoria adicionada com sucesso!' })
      return true
    } catch (e) {
      toast({ description: 'Erro ao adicionar categoria', variant: 'destructive' })
      return false
    }
  }

  const onSubmit = async (data: any) => {
    setIsSaving(true)
    try {
      const payload = {
        ...data,
        category_id: data.category_id || null,
        manufacturer_id: data.manufacturer_id || null,
      }

      if (!isEditMode) {
        const exists = await productService.checkSkuExists(payload.sku)
        if (exists) {
          form.setError('sku', { type: 'manual', message: 'Este SKU já existe' })
          setIsSaving(false)
          return
        }
        await productService.createProduct(payload)
        toast({ description: 'Produto salvo com sucesso!' })
      } else {
        const { error } = await supabase
          .from('products')
          .update({
            name: payload.name,
            sku: payload.sku,
            manufacturer_id: payload.manufacturer_id,
            price_usd: payload.price_usa,
            price_cost: payload.price_cost,
            price_brl: payload.price_brl,
            weight: payload.weight,
            dimensions: payload.dimensions,
            stock: payload.stock,
            ncm: payload.ncm,
            image_url: payload.image_url,
            description: payload.description,
            technical_info: payload.technical_info,
            is_special: payload.is_special,
            is_discontinued: payload.is_discontinued,
            category_id: payload.category_id,
          })
          .eq('id', id!)
        if (error) throw error
        toast({ description: 'Produto atualizado com sucesso!' })
      }
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
    isLoadingProduct,
    isExtracting,
    isSaving,
    handleExtractUrl,
    handleSuggestNcm,
    ncmSuggestions,
    setNcmSuggestions,
    isSuggestingNcm,
    onSubmit,
    isEditMode,
    handleAddCategory,
  }
}
