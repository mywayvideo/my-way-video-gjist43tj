import { useState, useEffect, useMemo, useRef } from 'react'
import { Discount } from '@/types/discount'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Search, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const schema = z.object({
  name: z.string().min(3, 'Mínimo de 3 caracteres'),
  discount_type: z.enum(['margin_percentage', 'price_usa_percentage'], {
    required_error: 'Tipo de desconto é obrigatório',
  }),
  discount_value: z.coerce.number().min(0.01, 'Valor deve ser maior que 0'),
  product_selection: z.array(z.string()).min(1, 'Selecione pelo menos um produto.'),
  status: z.enum(['active', 'inactive']),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
})

type FormData = z.infer<typeof schema>

interface Manufacturer {
  id: string
  name: string
}

interface ProductDetails {
  id: string
  name: string
  manufacturer_id: string | null
  category: string | null
}

interface Props {
  rule?: Discount
  products: { id: string; name: string }[]
  onClose: () => void
  onSave: (data: any) => Promise<void>
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

export default function DiscountRuleForm({ rule, onClose, onSave }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Data states
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [dbProducts, setDbProducts] = useState<ProductDetails[]>([])

  // Search states
  const [manufSearch, setManufSearch] = useState('')
  const [catSearch, setCatSearch] = useState('')
  const [prodSearch, setProdSearch] = useState('')

  const debouncedManufSearch = useDebounce(manufSearch, 300)
  const debouncedCatSearch = useDebounce(catSearch, 300)
  const debouncedProdSearch = useDebounce(prodSearch, 300)

  // Selection states
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string[]>>({})
  const [excludedProducts, setExcludedProducts] = useState<string[]>([])

  const initializedRuleId = useRef<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: rule?.name || '',
      discount_type: (rule?.discount_type as any) || 'margin_percentage',
      discount_value: rule?.discount_value || 0,
      product_selection: rule?.product_selection || [],
      status: rule ? (rule.is_active ? 'active' : 'inactive') : 'active',
      start_date: rule?.start_date ? new Date(rule.start_date).toISOString().split('T')[0] : '',
      end_date: rule?.end_date ? new Date(rule.end_date).toISOString().split('T')[0] : '',
    },
  })

  const selectedProducts = watch('product_selection') || []

  // Fetch required data from Supabase
  useEffect(() => {
    const loadData = async () => {
      const [mRes, pRes] = await Promise.all([
        supabase.from('manufacturers').select('id, name').order('name'),
        supabase.from('products').select('id, name, manufacturer_id, category').order('name'),
      ])
      if (mRes.data) setManufacturers(mRes.data)
      if (pRes.data) setDbProducts(pRes.data)
    }
    loadData()
  }, [])

  // Initialize states if editing an existing rule
  useEffect(() => {
    if (dbProducts.length === 0) return

    const currentRuleId = rule?.id || 'new'
    if (initializedRuleId.current === currentRuleId) return

    initializedRuleId.current = currentRuleId

    if (rule?.product_selection?.length) {
      const initialManufacturers = new Set<string>()
      const initialCategories: Record<string, Set<string>> = {}

      rule.product_selection.forEach((id) => {
        const p = dbProducts.find((prod) => prod.id === id)
        if (p && p.manufacturer_id) {
          initialManufacturers.add(p.manufacturer_id)
          if (p.category) {
            if (!initialCategories[p.manufacturer_id]) {
              initialCategories[p.manufacturer_id] = new Set()
            }
            initialCategories[p.manufacturer_id].add(p.category)
          }
        }
      })

      const mArr = Array.from(initialManufacturers)
      setSelectedManufacturers(mArr)

      const cObj: Record<string, string[]> = {}
      for (const mId of mArr) {
        cObj[mId] = initialCategories[mId] ? Array.from(initialCategories[mId]) : []
      }
      setSelectedCategories(cObj)

      const matching = dbProducts.filter((p) => {
        if (!p.manufacturer_id) return false
        if (!mArr.includes(p.manufacturer_id)) return false
        const cats = cObj[p.manufacturer_id] || []
        if (cats.length === 0) return true
        return cats.includes(p.category || '')
      })

      const excluded = matching
        .filter((p) => !rule.product_selection.includes(p.id))
        .map((p) => p.id)
      setExcludedProducts(excluded)

      setValue('product_selection', rule.product_selection, { shouldValidate: true })
    } else {
      setSelectedManufacturers([])
      setSelectedCategories({})
      setExcludedProducts([])
      setValue('product_selection', [], { shouldValidate: true })
    }
  }, [dbProducts, rule, setValue])

  // Filter Manufacturers
  const filteredManufacturers = useMemo(() => {
    return manufacturers.filter((m) =>
      m.name.toLowerCase().includes(debouncedManufSearch.toLowerCase()),
    )
  }, [manufacturers, debouncedManufSearch])

  // Match Products (AND logic: Manufacturer AND Category)
  const matchingProducts = useMemo(() => {
    return dbProducts.filter((p) => {
      if (!p.manufacturer_id) return false
      if (!selectedManufacturers.includes(p.manufacturer_id)) return false
      const catsForManuf = selectedCategories[p.manufacturer_id] || []
      if (catsForManuf.length === 0) return true
      return catsForManuf.includes(p.category || '')
    })
  }, [dbProducts, selectedManufacturers, selectedCategories])

  // Filter Matching Products
  const filteredProducts = useMemo(() => {
    if (!debouncedProdSearch) return matchingProducts
    return matchingProducts.filter((p) =>
      p.name.toLowerCase().includes(debouncedProdSearch.toLowerCase()),
    )
  }, [matchingProducts, debouncedProdSearch])

  // Sync to form 'product_selection'
  useEffect(() => {
    if (initializedRuleId.current !== (rule?.id || 'new')) return

    const newSelection = matchingProducts
      .map((p) => p.id)
      .filter((id) => !excludedProducts.includes(id))

    setValue('product_selection', newSelection, { shouldValidate: true })
  }, [matchingProducts, excludedProducts, setValue, rule])

  // Toggle handlers
  const toggleManufacturer = (mId: string, checked: boolean) => {
    setSelectedManufacturers((prev) => {
      if (checked) return [...prev, mId]
      return prev.filter((id) => id !== mId)
    })
    if (!checked) {
      setSelectedCategories((prev) => {
        const next = { ...prev }
        delete next[mId]
        return next
      })
    }
  }

  const toggleCategory = (mId: string, cat: string, checked: boolean) => {
    setSelectedCategories((prev) => {
      const next = { ...prev }
      const mCats = next[mId] || []
      if (checked) {
        next[mId] = [...mCats, cat]
      } else {
        next[mId] = mCats.filter((c) => c !== cat)
      }
      return next
    })
  }

  const toggleProduct = (pId: string, checked: boolean) => {
    setExcludedProducts((prev) => {
      if (checked) {
        return prev.filter((id) => id !== pId)
      } else {
        return [...prev, pId]
      }
    })
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      await onSave({
        name: data.name,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        product_selection: data.product_selection,
        is_active: data.status === 'active',
        start_date: data.start_date || null,
        end_date: data.end_date || null,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-card border rounded-lg shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      <div className="p-6 border-b bg-muted/20">
        <h2 className="text-lg font-semibold">{!rule ? 'Criar Nova Regra' : 'Editar Regra'}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure os detalhes e os produtos que farão parte deste desconto.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
        <fieldset disabled={isSubmitting} className="space-y-8 contents">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome da Regra <span className="text-destructive">*</span>
                </Label>
                <Input id="name" {...register('name')} placeholder="Ex: Black Friday" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Tipo de Desconto <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="discount_type"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="margin_percentage">Margem %</SelectItem>
                          <SelectItem value="price_usa_percentage">Price USA %</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_value">
                    Valor (%) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="discount_value"
                    type="number"
                    step="0.01"
                    {...register('discount_value')}
                  />
                  {errors.discount_value && (
                    <p className="text-sm text-destructive">{errors.discount_value.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data de Início (Opcional)</Label>
                  <Input id="start_date" type="date" {...register('start_date')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Data de Fim (Opcional)</Label>
                  <Input id="end_date" type="date" {...register('end_date')} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t">
            <Label className="text-base font-semibold">
              Seleção de Produtos <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border rounded-md p-4 bg-muted/10">
              {/* Step 1: Manufacturers */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-semibold">1. Fabricantes</Label>
                  <p className="text-xs text-muted-foreground">
                    {selectedManufacturers.length} fabricante(s) selecionado(s)
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar fabricante..."
                    value={manufSearch}
                    onChange={(e) => setManufSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <div className="h-[280px] overflow-y-auto border rounded-md bg-background p-2 space-y-1">
                  {filteredManufacturers.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedManufacturers.includes(m.id)}
                        onCheckedChange={(c) => toggleManufacturer(m.id, !!c)}
                        className="mt-0.5"
                      />
                      <span className="text-sm font-medium">{m.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Step 2: Categories */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-semibold">2. Categorias</Label>
                  <p className="text-xs text-muted-foreground">
                    {Object.values(selectedCategories).flat().length} categoria(s) selecionada(s)
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar categoria..."
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <div className="h-[280px] overflow-y-auto border rounded-md bg-background p-2 space-y-3">
                  {selectedManufacturers.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4 text-center">
                      Selecione um fabricante primeiro
                    </div>
                  ) : (
                    selectedManufacturers.map((mId) => {
                      const m = manufacturers.find((x) => x.id === mId)
                      if (!m) return null
                      const mCats = Array.from(
                        new Set(
                          dbProducts
                            .filter((p) => p.manufacturer_id === mId && p.category)
                            .map((p) => p.category as string),
                        ),
                      ).sort()
                      const filteredMCats = mCats.filter((c) =>
                        c.toLowerCase().includes(debouncedCatSearch.toLowerCase()),
                      )
                      if (filteredMCats.length === 0) return null

                      return (
                        <div key={mId} className="space-y-1">
                          <div className="text-xs font-bold text-muted-foreground uppercase px-2 py-1 bg-muted/30 rounded">
                            {m.name}
                          </div>
                          {filteredMCats.map((c) => (
                            <label
                              key={`${mId}-${c}`}
                              className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors ml-1"
                            >
                              <Checkbox
                                checked={(selectedCategories[mId] || []).includes(c)}
                                onCheckedChange={(checked) => toggleCategory(mId, c, !!checked)}
                                className="mt-0.5"
                              />
                              <span className="text-sm font-medium">{c}</span>
                            </label>
                          ))}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Step 3: Products */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-semibold">3. Produtos</Label>
                  <p className="text-xs text-muted-foreground">
                    {matchingProducts.length - excludedProducts.length} produto(s) selecionado(s)
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto..."
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <div className="h-[280px] overflow-y-auto border rounded-md bg-background p-2 space-y-1">
                  {matchingProducts.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4 text-center">
                      Nenhum produto correspondente
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const isIncluded = !excludedProducts.includes(p.id)
                      return (
                        <label
                          key={p.id}
                          className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={isIncluded}
                            onCheckedChange={(checked) => toggleProduct(p.id, !!checked)}
                            className="mt-0.5 shrink-0"
                          />
                          <span className="text-sm font-medium leading-tight">{p.name}</span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
            {errors.product_selection && (
              <p className="text-sm text-destructive font-medium mt-2">
                {errors.product_selection.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || selectedProducts.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar Regra'
              )}
            </Button>
          </div>
        </fieldset>
      </form>
    </div>
  )
}
