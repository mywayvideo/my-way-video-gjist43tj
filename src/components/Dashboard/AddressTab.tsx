import { useAddressForm } from '@/hooks/useAddressForm'
import { CustomerAddress } from '@/types/customer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, Plus, Edit2, Trash2, Save, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { CUSTOMER_LABELS } from '@/constants/customer'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const addressSchema = z.object({
  street: z.string().min(2, 'Obrigatório'),
  number: z.string().min(1, 'Obrigatório'),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().min(2, 'Obrigatório'),
  city: z.string().min(2, 'Obrigatório'),
  state: z.string().min(2, 'Obrigatório'),
  zip_code: z.string().min(8, 'Obrigatório'),
  country: z.string().min(2, 'Obrigatório'),
  is_default: z.boolean().default(false),
})

export function AddressTab({
  customerId,
  type,
}: {
  customerId?: string
  type: 'shipping' | 'billing'
}) {
  const { addresses, isLoading, addAddress, updateAddress, deleteAddress } = useAddressForm(
    customerId,
    type,
  )
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null)

  const form = useForm<z.infer<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'Brasil',
      is_default: false,
    },
  })

  const openModal = (address?: CustomerAddress) => {
    if (address) {
      setEditingAddress(address)
      form.reset({
        street: address.street,
        number: address.number,
        complement: address.complement || '',
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        zip_code: address.zip_code,
        country: address.country,
        is_default: address.is_default,
      })
    } else {
      setEditingAddress(null)
      form.reset({
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'Brasil',
        is_default: addresses.length === 0,
      })
    }
    setIsModalOpen(true)
  }

  const onSubmit = async (data: z.infer<typeof addressSchema>) => {
    if (editingAddress) {
      await updateAddress(editingAddress.id, data)
    } else {
      await addAddress({ ...data, address_type: type } as any)
    }
    setIsModalOpen(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {addresses.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-10 text-center flex flex-col items-center justify-center">
          <MapPin className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum endereço cadastrado</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-md">
            Adicione um endereço de {type === 'shipping' ? 'entrega' : 'cobrança'} para facilitar
            suas futuras compras.
          </p>
          <Button
            onClick={() => openModal()}
            className="bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" /> Adicionar Endereço
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="border border-border rounded-lg p-4 mb-4 flex flex-col"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {address.is_default && (
                    <span className="bg-primary text-primary-foreground py-1 px-2 rounded-full text-xs font-medium">
                      Padrão
                    </span>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  {!address.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-primary transition-all duration-200 mr-2"
                      onClick={async () => {
                        try {
                          await updateAddress(address.id, { is_default: true } as any)
                          toast.success('Endereço definido como padrão.')
                        } catch (e) {
                          toast.error('Erro ao atualizar endereço.')
                        }
                      }}
                    >
                      Usar Padrão
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-primary transition-all duration-200"
                    onClick={() => openModal(address)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  {!address.is_default && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive transition-all duration-200"
                      onClick={async () => {
                        if (confirm('Tem certeza que deseja excluir este endereço?')) {
                          try {
                            await deleteAddress(address.id)
                            toast.success('Endereço removido.')
                          } catch (e) {
                            toast.error('Erro ao remover endereço.')
                          }
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-sm space-y-1">
                <p className="font-medium">
                  {address.street}, {address.number}
                </p>
                {address.complement && (
                  <p className="text-muted-foreground">{address.complement}</p>
                )}
                <p className="text-muted-foreground">{address.neighborhood}</p>
                <p className="text-muted-foreground">
                  {address.city} - {address.state}
                </p>
                <p className="text-muted-foreground">
                  {address.zip_code} • {address.country}
                </p>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            className="h-full min-h-[160px] border-dashed border-2 flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-all duration-200 rounded-lg"
            onClick={() => openModal()}
          >
            <Plus className="w-6 h-6 text-muted-foreground" />
            <span>Adicionar Novo</span>
          </Button>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-card rounded-xl shadow-lg p-6 border-none [&>button]:text-muted-foreground hover:[&>button]:text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingAddress ? 'Editar Endereço' : 'Novo Endereço'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-foreground mb-2 block">
                        {CUSTOMER_LABELS.zip_code}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="border-input rounded-lg p-3 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-all duration-200"
                        />
                      </FormControl>
                      <FormMessage className="text-destructive text-sm mt-1" />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="font-semibold text-foreground mb-2 block">
                          {CUSTOMER_LABELS.street}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="border-input rounded-lg p-3 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-all duration-200"
                          />
                        </FormControl>
                        <FormMessage className="text-destructive text-sm mt-1" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-foreground mb-2 block">
                          {CUSTOMER_LABELS.number}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="border-input rounded-lg p-3 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-all duration-200"
                          />
                        </FormControl>
                        <FormMessage className="text-destructive text-sm mt-1" />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-foreground mb-2 block">
                        {CUSTOMER_LABELS.complement}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ''}
                          className="border-input rounded-lg p-3 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-all duration-200"
                        />
                      </FormControl>
                      <FormMessage className="text-destructive text-sm mt-1" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-foreground mb-2 block">
                        {CUSTOMER_LABELS.neighborhood}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="border-input rounded-lg p-3 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-all duration-200"
                        />
                      </FormControl>
                      <FormMessage className="text-destructive text-sm mt-1" />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-foreground mb-2 block">
                          {CUSTOMER_LABELS.city}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="border-input rounded-lg p-3 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-all duration-200"
                          />
                        </FormControl>
                        <FormMessage className="text-destructive text-sm mt-1" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-foreground mb-2 block">
                          {CUSTOMER_LABELS.state}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="border-input rounded-lg p-3 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-all duration-200"
                          />
                        </FormControl>
                        <FormMessage className="text-destructive text-sm mt-1" />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-foreground mb-2 block">
                        {CUSTOMER_LABELS.country}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="border-input rounded-lg p-3 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-all duration-200"
                        />
                      </FormControl>
                      <FormMessage className="text-destructive text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border border-input p-4 mt-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={editingAddress?.is_default}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {CUSTOMER_LABELS.is_default}
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4 flex gap-3">
                <Button
                  type="button"
                  className="bg-secondary text-secondary-foreground hover:opacity-80 transition-all duration-200"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
