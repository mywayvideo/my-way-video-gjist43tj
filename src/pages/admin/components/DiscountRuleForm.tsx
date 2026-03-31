import { useState } from 'react'
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

interface Props {
  rule?: Discount
  products: { id: string; name: string }[]
  onClose: () => void
  onSave: (data: any) => Promise<void>
}

export default function DiscountRuleForm({ rule, products, onClose, onSave }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const {
    register,
    handleSubmit,
    control,
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
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    Seleção de Produtos <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-xs font-medium bg-muted px-2 py-1 rounded-full">
                    {selectedProducts.length} selecionado(s)
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produtos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="border rounded-md overflow-hidden bg-background">
                  <div className="h-[280px] overflow-y-auto p-2">
                    <Controller
                      name="product_selection"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-1">
                          {filteredProducts.map((product) => (
                            <label
                              key={product.id}
                              className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
                            >
                              <Checkbox
                                checked={field.value.includes(product.id)}
                                onCheckedChange={(checked) => {
                                  const current = new Set(field.value)
                                  if (checked) current.add(product.id)
                                  else current.delete(product.id)
                                  field.onChange(Array.from(current))
                                }}
                                className="mt-0.5"
                              />
                              <span className="text-sm font-medium">{product.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    />
                  </div>
                </div>
                {errors.product_selection && (
                  <p className="text-sm text-destructive font-medium mt-2">
                    Selecione pelo menos um produto para aplicar o desconto.
                  </p>
                )}
              </div>
            </div>
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
