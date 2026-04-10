import { useState } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { DashboardAdminCustomers } from './DashboardAdminCustomers'
import { useCustomerManagement } from '@/hooks/useCustomerManagement'
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
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export default function AdminCustomersPage() {
  const customerParams = useCustomerManagement()
  const { toast } = useToast()

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)

  const handleEditCustomer = (customer: any) => {
    setEditingCustomer(customer)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCustomer) return
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          full_name: editingCustomer.full_name,
          email: editingCustomer.email,
          role: editingCustomer.role,
          status: editingCustomer.status,
          phone: editingCustomer.phone,
        })
        .eq('id', editingCustomer.id)

      if (error) throw error
      toast({ title: 'Sucesso', description: 'Cliente atualizado.' })
      setIsEditModalOpen(false)
      customerParams.refreshCustomers()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'customer',
  })

  const handleCreateCustomer = () => {
    setNewCustomer({ full_name: '', email: '', password: '', role: 'customer' })
    setIsCreateModalOpen(true)
  }

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.functions.invoke('create-customer', {
        body: {
          email: newCustomer.email,
          password: newCustomer.password,
          name: newCustomer.full_name,
          role: newCustomer.role,
        },
      })
      if (error) throw new Error(error.message || 'Erro ao criar cliente')
      toast({ title: 'Sucesso', description: 'Cliente criado.' })
      setIsCreateModalOpen(false)
      customerParams.refreshCustomers()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <AdminLayout breadcrumb="Gerenciar Clientes">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Clientes</h1>
          <p className="text-muted-foreground mt-2">
            Administre a base de clientes, níveis de acesso e informações.
          </p>
        </div>
        <DashboardAdminCustomers
          {...customerParams}
          handleEditCustomer={handleEditCustomer}
          handleCreateCustomer={handleCreateCustomer}
        />

        <Sheet open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Editar Cliente</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              {editingCustomer && (
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={editingCustomer.full_name || ''}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, full_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={editingCustomer.email || ''}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={editingCustomer.phone || ''}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Perfil</Label>
                    <Select
                      value={editingCustomer.role}
                      onValueChange={(v) => setEditingCustomer({ ...editingCustomer, role: v })}
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
                      value={editingCustomer.status}
                      onValueChange={(v) => setEditingCustomer({ ...editingCustomer, status: v })}
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
                  <Button type="submit" className="w-full">
                    Salvar
                  </Button>
                </form>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Novo Cliente</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <form onSubmit={handleSaveCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    required
                    value={newCustomer.full_name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    required
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    required
                    type="password"
                    minLength={8}
                    value={newCustomer.password}
                    onChange={(e) => setNewCustomer({ ...newCustomer, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <Select
                    value={newCustomer.role}
                    onValueChange={(v) => setNewCustomer({ ...newCustomer, role: v })}
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
                <Button type="submit" className="w-full">
                  Criar Cliente
                </Button>
              </form>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </AdminLayout>
  )
}
