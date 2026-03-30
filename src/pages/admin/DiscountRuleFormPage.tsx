import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useDiscountRule } from '@/hooks/useDiscountRule'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Trash, Search, X } from 'lucide-react'

const schema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório').max(100, 'Máximo de 100 caracteres'),
    discount_type: z.enum(['margin_percentage', 'price_usa_percentage'], {
      required_error: 'Tipo de desconto é obrigatório',
    }),
    value: z.coerce.number().min(0, 'Valor não pode ser negativo').max(100, 'Valor máximo é 100'),
    status: z.enum(['active', 'inactive']),
    scope: z.enum([
      'all_products',
      'by_manufacturer',
      'by_category',
      'by_manufacturer_category',
      'individual_products',
    ]),
    scope_manufacturers: z.array(z.string()).default([]),
    scope_categories: z.array(z.string()).default([]),
    scope_individual_products: z.array(z.string()).default([]),
    application_type: z.enum(['role', 'specific_customers']),
    role: z.string().optional(),
    customers: z.array(z.string()).default([]),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.application_type === 'specific_customers' && data.customers.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione pelo menos um cliente.',
        path: ['customers'],
      })
    }
    if (data.start_date && data.end_date) {
      if (new Date(data.end_date) <= new Date(data.start_date)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Data de fim deve ser após a data de início.',
          path: ['end_date'],
        })
      }
    }
  })

type FormData = z.infer<typeof schema>

const MultiSelect = ({
  items,
  fieldName,
  title,
  control,
}: {
  items: any[]
  fieldName: any
  title: string
  control: any
}) => {
  const [search, setSearch] = useState('')
  const filtered = items.filter((i) => i.name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-2 mt-4">
      <Label>{title}</Label>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="h-48 overflow-y-auto border rounded-md p-4 space-y-3 bg-background">
        <Controller
          name={fieldName}
          control={control}
          render={({ field }) => (
            <>
              {filtered.map((item) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${fieldName}-${item.id}`}
                    checked={field.value.includes(item.id)}
                    onCheckedChange={(checked) => {
                      if (checked) field.onChange([...field.value, item.id])
                      else field.onChange(field.value.filter((id: string) => id !== item.id))
                    }}
                  />
                  <Label
                    htmlFor={`${fieldName}-${item.id}`}
                    className="font-normal cursor-pointer leading-tight"
                  >
                    {item.name}
                  </Label>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum item encontrado.</p>
              )}
            </>
          )}
        />
      </div>
    </div>
  )
}

const ProductList = ({
  products,
  manufacturers,
  removedIds,
  uncheckedIds,
  onRemove,
  onToggleCheck,
  scope,
}: {
  products: any[]
  manufacturers: any[]
  removedIds: Set<string>
  uncheckedIds: Set<string>
  onRemove: (id: string) => void
  onToggleCheck: (id: string, checked: boolean) => void
  scope: string
}) => {
  const displayed = products.filter((p) => !removedIds.has(p.id))
  const checkedCount = displayed.filter((p) => !uncheckedIds.has(p.id)).length

  return (
    <div className="space-y-4 mt-6">
      <Label className="text-base font-semibold">Produtos Selecionados ({checkedCount})</Label>
      <div className="border rounded-md divide-y max-h-96 overflow-y-auto bg-background shadow-sm">
        {displayed.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <Checkbox
                checked={!uncheckedIds.has(p.id)}
                onCheckedChange={(checked) => onToggleCheck(p.id, !!checked)}
              />
              <div className="space-y-1">
                <p className="font-medium text-sm leading-none">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {manufacturers.find((m) => m.id === p.manufacturer_id)?.name || 'Sem Fabricante'}{' '}
                  • {p.category || 'Sem categoria'} • ${p.price_usd || 0}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
              onClick={() => onRemove(p.id)}
              title="Remover produto da lista"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground text-center">
            Nenhum produto selecionado.
          </div>
        )}
      </div>
      {checkedCount === 0 && (
        <p className="text-sm text-destructive font-medium mt-2">
          Selecione pelo menos um produto para aplicar o desconto.
        </p>
      )}
    </div>
  )
}

export default function DiscountRuleFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const {
    rule,
    loading,
    error,
    manufacturers,
    categories,
    products,
    customers,
    saveRule,
    deleteRule,
    retry,
  } = useDiscountRule(id)

  const [isSaving, setIsSaving] = useState(false)
  const [removedProductIds, setRemovedProductIds] = useState<Set<string>>(new Set())
  const [uncheckedProductIds, setUncheckedProductIds] = useState<Set<string>>(new Set())
  const [hasInitialized, setHasInitialized] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      discount_type: 'margin_percentage',
      value: 0,
      status: 'active',
      scope: 'all_products',
      scope_manufacturers: [],
      scope_categories: [],
      scope_individual_products: [],
      application_type: 'role',
      role: '',
      customers: [],
      start_date: '',
      end_date: '',
    },
  })

  const scope = watch('scope')
  const application_type = watch('application_type')
  const scope_manufacturers = watch('scope_manufacturers')
  const scope_categories = watch('scope_categories')
  const scope_individual_products = watch('scope_individual_products')

  useEffect(() => {
    if (rule && products.length > 0 && !hasInitialized) {
      const dbScope = (rule.scope_type as any) || 'all_products'
      const dbScopeData = rule.scope_data || []

      let initialMfrs: string[] = []
      let initialCats: string[] = []
      let initialIndiv: string[] = []
      let initialUnchecked = new Set<string>()

      const selectedProds = products.filter((p) => dbScopeData.includes(p.id))

      if (dbScope === 'all_products') {
        if (dbScopeData && dbScopeData.length > 0) {
          products.forEach((p) => {
            if (!dbScopeData.includes(p.id)) {
              initialUnchecked.add(p.id)
            }
          })
        }
      } else {
        if (selectedProds.length > 0) {
          if (dbScope === 'by_manufacturer') {
            initialMfrs = Array.from(
              new Set(selectedProds.map((p) => p.manufacturer_id).filter(Boolean) as string[]),
            )
            products.forEach((p) => {
              if (
                p.manufacturer_id &&
                initialMfrs.includes(p.manufacturer_id) &&
                !dbScopeData.includes(p.id)
              ) {
                initialUnchecked.add(p.id)
              }
            })
          } else if (dbScope === 'by_category') {
            initialCats = Array.from(
              new Set(selectedProds.map((p) => p.category).filter(Boolean) as string[]),
            )
            products.forEach((p) => {
              if (p.category && initialCats.includes(p.category) && !dbScopeData.includes(p.id)) {
                initialUnchecked.add(p.id)
              }
            })
          } else if (dbScope === 'by_manufacturer_category') {
            initialMfrs = Array.from(
              new Set(selectedProds.map((p) => p.manufacturer_id).filter(Boolean) as string[]),
            )
            initialCats = Array.from(
              new Set(selectedProds.map((p) => p.category).filter(Boolean) as string[]),
            )
            products.forEach((p) => {
              if (
                p.manufacturer_id &&
                p.category &&
                initialMfrs.includes(p.manufacturer_id) &&
                initialCats.includes(p.category) &&
                !dbScopeData.includes(p.id)
              ) {
                initialUnchecked.add(p.id)
              }
            })
          } else if (dbScope === 'individual_products') {
            initialIndiv = dbScopeData
          }
        } else {
          // Old format fallback
          if (dbScope === 'by_manufacturer') initialMfrs = dbScopeData
          else if (dbScope === 'by_category') initialCats = dbScopeData
          else if (dbScope === 'individual_products') initialIndiv = dbScopeData
        }
      }

      reset({
        name: rule.rule_name || '',
        discount_type: (rule.discount_calculation_type as any) || 'margin_percentage',
        value: rule.discount_value || 0,
        status: rule.is_active ? 'active' : 'inactive',
        scope: dbScope,
        scope_manufacturers: initialMfrs,
        scope_categories: initialCats,
        scope_individual_products: initialIndiv,
        application_type: (rule.application_type as any) || 'role',
        role: rule.role || '',
        customers: rule.customers || [],
        start_date: rule.start_date ? new Date(rule.start_date).toISOString().split('T')[0] : '',
        end_date: rule.end_date ? new Date(rule.end_date).toISOString().split('T')[0] : '',
      })
      setHasInitialized(true)
      setRemovedProductIds(new Set())
      setUncheckedProductIds(initialUnchecked)
    }
  }, [rule, products, reset, hasInitialized])

  const eligibleProducts = useMemo(() => {
    if (scope === 'all_products') {
      return products
    }
    if (scope === 'by_manufacturer') {
      return products.filter(
        (p) => p.manufacturer_id && scope_manufacturers.includes(p.manufacturer_id),
      )
    }
    if (scope === 'by_category') {
      return products.filter((p) => p.category && scope_categories.includes(p.category))
    }
    if (scope === 'by_manufacturer_category') {
      return products.filter(
        (p) =>
          p.manufacturer_id &&
          p.category &&
          scope_manufacturers.includes(p.manufacturer_id) &&
          scope_categories.includes(p.category),
      )
    }
    if (scope === 'individual_products') {
      return products.filter((p) => scope_individual_products.includes(p.id))
    }
    return []
  }, [scope, scope_manufacturers, scope_categories, scope_individual_products, products])

  const displayedProducts = useMemo(() => {
    return eligibleProducts.filter((p) => !removedProductIds.has(p.id))
  }, [eligibleProducts, removedProductIds])

  const onSubmit = async (data: FormData) => {
    const finalProductIds = displayedProducts
      .filter((p) => !uncheckedProductIds.has(p.id))
      .map((p) => p.id)

    if (finalProductIds.length === 0) {
      return // UI will show validation error
    }

    const payload = {
      ...data,
      scope_data: finalProductIds,
    }

    setIsSaving(true)
    const success = await saveRule({ id, ...payload })
    setIsSaving(false)
    if (success) {
      navigate('/dashboard-admin')
    }
  }

  const handleDelete = async () => {
    if (!id) return
    const success = await deleteRule(id)
    if (success) {
      navigate('/dashboard-admin')
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          <p>{error}</p>
        </div>
        <Button onClick={retry} variant="outline">
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard-admin')}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">
          {isEdit ? 'Editar Regra de Desconto' : 'Criar Regra de Desconto'}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
      >
        <div className="space-y-6 md:space-y-8">
          {/* Section 1 */}
          <div className="bg-card border rounded-lg p-5 md:p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold border-b pb-2">Informações Básicas</h2>

            <div className="space-y-2">
              <Label htmlFor="name">Nome da Regra</Label>
              <Input id="name" {...register('name')} placeholder="Ex: Black Friday" />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Desconto</Label>
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
                {errors.discount_type && (
                  <p className="text-sm text-destructive">{errors.discount_type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Valor</Label>
                <Input id="value" type="number" step="0.01" {...register('value')} />
                {errors.value && <p className="text-sm text-destructive">{errors.value.message}</p>}
              </div>
            </div>

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
          </div>

          {/* Section 4 */}
          <div className="bg-card border rounded-lg p-5 md:p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold border-b pb-2">Datas (Opcional)</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Data de Início</Label>
                <Input id="start_date" type="date" {...register('start_date')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Data de Fim</Label>
                <Input id="end_date" type="date" {...register('end_date')} />
              </div>
            </div>
            {errors.end_date && (
              <p className="text-sm text-destructive">{errors.end_date.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          {/* Section 2 */}
          <div className="bg-card border rounded-lg p-5 md:p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold border-b pb-2">Escopo</h2>

            <div className="space-y-2">
              <Label>Tipo de Escopo</Label>
              <Controller
                name="scope"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val)
                      setValue('scope_manufacturers', [])
                      setValue('scope_categories', [])
                      setValue('scope_individual_products', [])
                      setRemovedProductIds(new Set())
                      setUncheckedProductIds(new Set())
                    }}
                    value={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_products">Todos os Produtos</SelectItem>
                      <SelectItem value="by_manufacturer">Por Fabricante</SelectItem>
                      <SelectItem value="by_category">Por Categoria</SelectItem>
                      <SelectItem value="by_manufacturer_category">
                        Por Fabricante + Categoria
                      </SelectItem>
                      <SelectItem value="individual_products">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {scope === 'by_manufacturer' && (
              <MultiSelect
                items={manufacturers}
                fieldName="scope_manufacturers"
                title="Fabricantes"
                control={control}
              />
            )}
            {scope === 'by_category' && (
              <MultiSelect
                items={categories}
                fieldName="scope_categories"
                title="Categorias"
                control={control}
              />
            )}
            {scope === 'by_manufacturer_category' && (
              <div className="space-y-4 pt-2">
                <MultiSelect
                  items={manufacturers}
                  fieldName="scope_manufacturers"
                  title="Fabricantes"
                  control={control}
                />
                <MultiSelect
                  items={categories}
                  fieldName="scope_categories"
                  title="Categorias"
                  control={control}
                />
              </div>
            )}
            {scope === 'individual_products' && (
              <MultiSelect
                items={products}
                fieldName="scope_individual_products"
                title="Buscar Produtos"
                control={control}
              />
            )}

            <ProductList
              products={eligibleProducts}
              manufacturers={manufacturers}
              removedIds={removedProductIds}
              uncheckedIds={uncheckedProductIds}
              onRemove={(id) => {
                const newSet = new Set(removedProductIds)
                newSet.add(id)
                setRemovedProductIds(newSet)
              }}
              onToggleCheck={(id, checked) => {
                const newSet = new Set(uncheckedProductIds)
                if (checked) newSet.delete(id)
                else newSet.add(id)
                setUncheckedProductIds(newSet)
              }}
              scope={scope}
            />
          </div>

          {/* Section 3 */}
          <div className="bg-card border rounded-lg p-5 md:p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold border-b pb-2">Aplicação de Clientes</h2>

            <Controller
              name="application_type"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  onValueChange={(val) => {
                    field.onChange(val)
                    if (val === 'role') setValue('customers', [])
                    else setValue('role', '')
                  }}
                  value={field.value}
                  className="space-y-4"
                >
                  <div className="flex items-start space-x-2 border rounded-md p-4 bg-muted/20">
                    <RadioGroupItem value="role" id="opt-role" className="mt-1" />
                    <div className="space-y-2 w-full">
                      <Label htmlFor="opt-role" className="text-base cursor-pointer">
                        Por Regra de Cliente
                      </Label>
                      {application_type === 'role' && (
                        <div className="space-y-2 pt-2">
                          <Controller
                            name="role"
                            control={control}
                            render={({ field: roleField }) => (
                              <Select
                                onValueChange={(v) => roleField.onChange(v === 'all' ? '' : v)}
                                value={roleField.value || 'all'}
                              >
                                <SelectTrigger className="bg-background">
                                  <SelectValue placeholder="Todas as Roles" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todas as Roles</SelectItem>
                                  <SelectItem value="vip">VIP</SelectItem>
                                  <SelectItem value="reseller">Reseller</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                          <p className="text-sm text-muted-foreground">
                            Essa regra será aplicada a TODOS os clientes com a role selecionada. Se
                            nenhuma for selecionada, aplicará a TODOS os clientes.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 border rounded-md p-4 bg-muted/20">
                    <RadioGroupItem value="specific_customers" id="opt-specific" className="mt-1" />
                    <div className="space-y-2 w-full">
                      <Label htmlFor="opt-specific" className="text-base cursor-pointer">
                        Clientes Específicos
                      </Label>
                      {application_type === 'specific_customers' && (
                        <div className="pt-2">
                          <MultiSelect
                            items={customers}
                            fieldName="customers"
                            title="Lista de Clientes"
                            control={control}
                          />
                          <p className="text-sm text-muted-foreground mt-3">
                            Essa regra será aplicada APENAS aos clientes selecionados acima.
                          </p>
                          {errors.customers && (
                            <p className="text-sm text-destructive mt-1 font-medium">
                              {errors.customers.message}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </RadioGroup>
              )}
            />
          </div>
        </div>

        {/* Form Buttons */}
        <div className="md:col-span-2 flex flex-col sm:flex-row items-center justify-between pt-6 border-t mt-4 gap-4">
          <div className="w-full sm:w-auto order-2 sm:order-1">
            {isEdit && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="w-full sm:w-auto">
                    <Trash className="w-4 h-4 mr-2" /> Deletar Regra
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza que deseja deletar esta regra?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente a regra de
                      desconto.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sim, deletar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto order-1 sm:order-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard-admin')}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-sm"
            >
              {isSaving ? 'Salvando...' : 'Salvar Regra'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
