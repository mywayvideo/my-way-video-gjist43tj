import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Search, AlertCircle, RefreshCw, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebounce } from '@/hooks/use-debounce'

const roleColors: Record<string, string> = {
  customer: 'bg-gray-500 hover:bg-gray-600',
  vip: 'bg-yellow-500 hover:bg-yellow-600 text-yellow-950',
  reseller: 'bg-blue-500 hover:bg-blue-600',
  collaborator: 'bg-green-500 hover:bg-green-600',
  admin: 'bg-red-500 hover:bg-red-600',
}

export function DashboardAdminCustomers({
  customers,
  customersTotal,
  loadingCustomers,
  error,
  fetchCustomers,
  updateCustomerRole,
}: any) {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(searchTerm, 300)

  useEffect(() => {
    fetchCustomers(page, 20, debouncedSearch, roleFilter)
  }, [page, debouncedSearch, roleFilter, fetchCustomers])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filtrar por role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os roles</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="reseller">Reseller</SelectItem>
            <SelectItem value="collaborator">Collaborator</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="text-center p-8">
          <AlertCircle className="mx-auto text-red-500 mb-2" />
          <p>{error}</p>
          <Button
            onClick={() => fetchCustomers(page, 20, debouncedSearch, roleFilter)}
            className="mt-4"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Tentar Novamente
          </Button>
        </div>
      ) : loadingCustomers ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center p-12 border border-dashed rounded-lg">
          <Users className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum cliente encontrado.</p>
        </div>
      ) : (
        <div className="w-full">
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 text-muted-foreground font-medium border-b">
            <div className="col-span-4">Nome</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-2">Role Atual</div>
            <div className="col-span-3">Ação</div>
          </div>
          {customers.map((c: any) => (
            <CustomerRow key={c.id} customer={c} onUpdate={updateCustomerRole} />
          ))}

          <div className="flex justify-between items-center mt-6">
            <Button disabled={page === 1} onClick={() => setPage((p) => p - 1)} variant="outline">
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">Página {page}</span>
            <Button
              disabled={page * 20 >= customersTotal}
              onClick={() => setPage((p) => p + 1)}
              variant="outline"
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function CustomerRow({ customer, onUpdate }: any) {
  const [editingRole, setEditingRole] = useState<string>(customer.role)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const hasChanges = editingRole !== customer.role

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await onUpdate(customer.id, editingRole)
      toast({ title: `Role atualizado com sucesso para ${customer.full_name || 'o cliente'}!` })
    } catch (e) {
      toast({ title: 'Não foi possível atualizar role.', variant: 'destructive' })
      setEditingRole(customer.role)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col md:grid md:grid-cols-12 gap-4 p-4 border-b md:border-b-0 md:border-t md:items-center">
      <div className="md:col-span-4">
        <span className="md:hidden font-medium text-xs text-muted-foreground block mb-1">Nome</span>
        <span className="font-semibold md:font-normal">{customer.full_name || 'Sem Nome'}</span>
      </div>
      <div className="md:col-span-3">
        <span className="md:hidden font-medium text-xs text-muted-foreground block mb-1">
          Email
        </span>
        <span className="text-sm">{customer.email}</span>
      </div>
      <div className="md:col-span-2">
        <span className="md:hidden font-medium text-xs text-muted-foreground block mb-1">
          Role Atual
        </span>
        <Badge className={roleColors[customer.role] || roleColors.customer}>{customer.role}</Badge>
      </div>
      <div className="md:col-span-3 flex flex-wrap items-center gap-2">
        <span className="md:hidden font-medium text-xs text-muted-foreground w-full mb-1">
          Ação
        </span>
        <Select value={editingRole} onValueChange={setEditingRole}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['customer', 'vip', 'reseller', 'collaborator', 'admin'].map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasChanges && (
          <>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              Salvar
            </Button>
            <Button
              onClick={() => setEditingRole(customer.role)}
              disabled={isSaving}
              size="sm"
              variant="secondary"
            >
              Cancelar
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
