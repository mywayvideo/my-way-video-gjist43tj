import { useAddressForm } from '@/hooks/useAddressForm'
import { CustomerAddress } from '@/types/customer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, Plus, Edit2, Trash2, Save, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { CUSTOMER_LABELS } from '@/constants/customer'
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
    <div className="space-y-6 animate-fade-in-up">
      {addresses.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum endereço cadastrado</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md">
              Adicione um endereço de {type === 'shipping' ? 'entrega' : 'cobrança'} para facilitar
              suas futuras compras.
            </p>
            <Button onClick={() => openModal()}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar Endereço
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <Card
              key={address.id}
              className={address.is_default ? 'border-primary/50 shadow-sm' : ''}
            >
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {address.is_default && (
                      <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        PADRÃO
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openModal(address)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    {!address.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este endereço?'))
                            deleteAddress(address.id)
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
              </CardContent>
            </Card>
          ))}
          <Button
            variant="outline"
            className="h-full min-h-[160px] border-dashed flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
            onClick={() => openModal()}
          >
            <Plus className="w-6 h-6 text-muted-foreground" />
            <span>Adicionar Novo</span>
          </Button>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Editar Endereço' : 'Novo Endereço'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <FormField
                  control={form.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{CUSTOMER_LABELS.zip_code}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem className="md:col-span-4">
                      <FormLabel>{CUSTOMER_LABELS.street}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{CUSTOMER_LABELS.number}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem className="md:col-span-4">
                      <FormLabel>{CUSTOMER_LABELS.complement}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem className="md:col-span-3">
                      <FormLabel>{CUSTOMER_LABELS.neighborhood}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="md:col-span-3">
                      <FormLabel>{CUSTOMER_LABELS.city}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem className="md:col-span-3">
                      <FormLabel>{CUSTOMER_LABELS.state}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem className="md:col-span-3">
                      <FormLabel>{CUSTOMER_LABELS.country}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={editingAddress?.is_default}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{CUSTOMER_LABELS.is_default}</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}{' '}
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
