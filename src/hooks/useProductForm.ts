import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productService } from '@/services/productService'
import { z } from 'zod'
import { useToast } from '@/hooks/use-toast'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  sku: z.string().min(1, 'SKU é obrigatório'),
  manufacturer_id: z.string().catch('').default(''),
  price_cost: z.coerce.number().catch(0).default(0),
  price_usa: z.coerce.number().catch(0).default(0),
  price_brl: z.coerce.number().catch(0).default(0),
  stock: z.coerce.number().catch(0).default(0),
  category_id: z.string().catch('').default(''),
  category: z.string().catch('').default(''),
  description: z
    .any()
    .transform((v) => (typeof v === 'string' ? v : v ? JSON.stringify(v, null, 2) : '')),
  weight: z.coerce.number().catch(0).default(0),
  dimensions: z.string().catch('').default(''),
  image_url: z.string().catch('').default(''),
  ncm: z.string().catch('').default(''),
  is_special: z.boolean().catch(false).default(false),
  technical_info: z
    .any()
    .transform((v) => (typeof v === 'string' ? v : v ? JSON.stringify(v, null, 2) : '')),
  is_discontinued: z.boolean().catch(false).default(false),
})

export interface UseProductFormProps {
  initialData?: any
  onSuccess?: () => void
}

export function useProductForm(props?: UseProductFormProps) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { id: routeId } = useParams<{ id: string }>()

  const initialId = props?.initialData?.id
  const id = initialId || routeId
  const isEditMode = !!id

  const [categories, setCategories] = useState<any[]>([])
  const [manufacturers, setManufacturers] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isLoadingManufacturers, setIsLoadingManufacturers] = useState(true)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingProduct, setIsLoadingProduct] = useState(!!id)
  const [ncmSuggestions, setNcmSuggestions] = useState<any[]>([])
  const [isSuggestingNcm, setIsSuggestingNcm] = useState(false)

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
      category: '',
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

  const loadManufacturers = async () => {
    try {
      const mfgs = await productService.getManufacturers()
      setManufacturers(mfgs)
    } catch {
      toast({ description: 'Erro ao carregar fabricantes', variant: 'destructive' })
    } finally {
      setIsLoadingManufacturers(false)
    }
  }

  useEffect(() => {
    loadCategories()
    loadManufacturers()
  }, [toast])

  const initialDataStr = JSON.stringify(props?.initialData || {})

  useEffect(() => {
    if (props?.initialData && Object.keys(props.initialData).length > 0) {
      form.reset({
        name: props.initialData.name || '',
        sku: props.initialData.sku || '',
        manufacturer_id: props.initialData.manufacturer_id || '',
        price_cost: props.initialData.price_cost || 0,
        price_usa: props.initialData.price_usd || props.initialData.price_usa || 0,
        price_brl: props.initialData.price_brl || 0,
        stock: props.initialData.stock || 0,
        category_id: props.initialData.category_id || '',
        category: props.initialData.category || '',
        description: props.initialData.description || '',
        weight: props.initialData.weight || 0,
        dimensions: props.initialData.dimensions || '',
        image_url: props.initialData.image_url || '',
        ncm: props.initialData.ncm || '',
        is_special: props.initialData.is_special || false,
        technical_info: props.initialData.technical_info || '',
        is_discontinued: props.initialData.is_discontinued || false,
      })
      setIsLoadingProduct(false)
    } else if (routeId) {
      const loadProduct = async () => {
        setIsLoadingProduct(true)
        try {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', routeId)
            .single()
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
              category: data.category || '',
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
    } else {
      setIsLoadingProduct(false)
    }
  }, [routeId, initialDataStr, form, navigate, toast])

  const price_usa = form.watch('price_usa')
  const weight = form.watch('weight')

  useEffect(() => {
    const updateBrl = async () => {
      if (price_usa > 0 && weight > 0) {
        try {
          const brl = await productService.calculateBrl(price_usa, weight)
          form.setValue('price_brl', brl, { shouldDirty: true })
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
      if (data.name) form.setValue('name', data.name, { shouldDirty: true })
      if (data.sku) form.setValue('sku', data.sku, { shouldDirty: true })
      if (data.description) {
        const descStr =
          typeof data.description === 'string'
            ? data.description
            : JSON.stringify(data.description, null, 2)
        form.setValue('description', descStr, { shouldDirty: true })
      }
      if (data.technical_info) {
        const techInfoStr =
          typeof data.technical_info === 'string'
            ? data.technical_info
            : JSON.stringify(data.technical_info, null, 2)
        form.setValue('technical_info', techInfoStr, { shouldDirty: true })
      }
      if (data.image_url) form.setValue('image_url', data.image_url, { shouldDirty: true })
      if (data.dimensions) form.setValue('dimensions', data.dimensions, { shouldDirty: true })
      if (data.category) form.setValue('category', data.category, { shouldDirty: true })
      if (data.category_id && categories.some((c) => c.id === data.category_id)) {
        form.setValue('category_id', data.category_id, { shouldDirty: true })
      }
      if (data.manufacturer_id) {
        form.setValue('manufacturer_id', data.manufacturer_id, { shouldDirty: true })
      }
      if (data.price_usa)
        form.setValue('price_usa', parseFloat(data.price_usa) || 0, { shouldDirty: true })
      if (data.price_cost)
        form.setValue('price_cost', parseFloat(data.price_cost) || 0, { shouldDirty: true })
      if (data.weight) form.setValue('weight', parseFloat(data.weight) || 0, { shouldDirty: true })
      if (data.stock) form.setValue('stock', parseInt(data.stock, 10) || 0, { shouldDirty: true })
      form.setValue('is_discontinued', data.is_discontinued === 'true', { shouldDirty: true })
      form.setValue('is_special', data.is_special === 'true', { shouldDirty: true })
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

  const handleAddManufacturer = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('manufacturers')
        .insert({ name })
        .select()
        .single()
      if (error) throw error
      await loadManufacturers()
      form.setValue('manufacturer_id', data.id)
      toast({ description: 'Fabricante adicionado com sucesso!' })
      return true
    } catch (e) {
      toast({ description: 'Erro ao adicionar fabricante', variant: 'destructive' })
      return false
    }
  }

  const onSubmit = async (data: any) => {
    setIsSaving(true)
    try {
      const payload = {
        ...data,
        category_id: data.category_id && data.category_id.trim() !== '' ? data.category_id : null,
        manufacturer_id:
          data.manufacturer_id && data.manufacturer_id.trim() !== '' ? data.manufacturer_id : null,
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
        await productService.updateProduct(id!, payload)
        toast({ description: 'Produto atualizado com sucesso!' })
      }

      if (props?.onSuccess) {
        props.onSuccess()
      } else {
        setTimeout(() => navigate('/admin/catalog'), 2000)
      }
    } catch (err) {
      toast({ description: 'Não foi possível salvar o produto', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  return {
    form,
    categories,
    manufacturers,
    isLoadingCategories,
    isLoadingManufacturers,
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
    handleAddManufacturer,
  }
}
