import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CustomerAddressForm } from './CustomerAddressForm'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: any
  setCustomer: (customer: any) => void
  onSave: (e: React.FormEvent) => void
}

export function EditCustomerModal({ open, onOpenChange, customer, setCustomer, onSave }: Props) {
  if (!customer) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle>Editar Cliente</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6">
          <form onSubmit={onSave} className="space-y-4 pb-6 mt-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="shipping">Entrega</TabsTrigger>
                <TabsTrigger value="billing">Cobrança</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={customer.full_name || ''}
                    onChange={(e) => setCustomer({ ...customer, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={customer.email || ''}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input
                    value={customer.cpf || ''}
                    onChange={(e) => setCustomer({ ...customer, cpf: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={customer.phone || ''}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <Select
                    value={customer.role}
                    onValueChange={(v) => setCustomer({ ...customer, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="collaborator">Colaborador</SelectItem>
                      <SelectItem value="customer">Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={customer.status}
                    onValueChange={(v) => setCustomer({ ...customer, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="shipping">
                <CustomerAddressForm
                  type="shipping"
                  address={customer.shipping_address}
                  onChange={(_, addr) => setCustomer({ ...customer, shipping_address: addr })}
                />
              </TabsContent>

              <TabsContent value="billing">
                <CustomerAddressForm
                  type="billing"
                  address={customer.billing_address}
                  onChange={(_, addr) => setCustomer({ ...customer, billing_address: addr })}
                />
              </TabsContent>
            </Tabs>
            <div className="pt-4">
              <Button type="submit" className="w-full">
                Salvar Alterações
              </Button>
            </div>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
