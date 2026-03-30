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
import { useToast } from '@/hooks/use-toast'
import { Search, AlertCircle, RefreshCw, Users, Check, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebounce } from '@/hooks/use-debounce'

const roleColors: Record<string, string> = {
  customer: 'bg-gray-200 text-gray-900',
  vip: 'bg-yellow-400 text-yellow-900',
  reseller: 'bg-blue-200 text-blue-900',
  collaborator: 'bg-green-200 text-green-900',
  admin: 'bg-red-200 text-red-900',
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 border border-border rounded-lg text-[14px] focus-visible:ring-2 focus-visible:ring-yellow-500/20 focus-visible:border-yellow-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full md:w-[200px] border border-border rounded-lg text-[13px] py-2.5 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500">
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
        <div className="text-center py-[48px] px-6">
          <AlertCircle className="mx-auto h-[64px] w-[64px] text-red-500 mb-4" />
          <h3 className="text-[18px] font-semibold text-foreground mb-2">
            Não foi possível carregar clientes.
          </h3>
          <p className="text-[14px] text-gray-500 mb-6">{error}</p>
          <Button
            onClick={() => fetchCustomers(page, 20, debouncedSearch, roleFilter)}
            className="px-6 py-[10px] bg-yellow-500 text-black font-semibold rounded-[8px] hover:bg-yellow-600 hover:scale-105 transition-all"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Tentar Novamente
          </Button>
        </div>
      ) : loadingCustomers ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[40px] rounded-[8px] w-full" />
          ))}
        </div>
      ) : customers?.length === 0 ? (
        <div className="text-center py-[48px] px-6">
          <Users className="mx-auto h-[64px] w-[64px] text-gray-300 mb-4" />
          <h3 className="text-[18px] font-semibold text-foreground mb-2">
            Nenhum cliente encontrado.
          </h3>
          <p className="text-[14px] text-gray-500 mb-6">Tente ajustar seus filtros de busca.</p>
          {(searchTerm || roleFilter !== 'all') && (
            <Button
              onClick={() => {
                setSearchTerm('')
                setRoleFilter('all')
              }}
              className="px-6 py-[10px] bg-yellow-500 text-black font-semibold rounded-[8px] hover:bg-yellow-600 hover:scale-105 transition-all"
            >
              Limpar Filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="hidden md:grid grid-cols-12 gap-4 p-3 bg-muted text-foreground font-semibold text-left border-b border-border rounded-t-lg">
            <div className="col-span-4">Nome</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-2">Role Atual</div>
            <div className="col-span-3">Ação</div>
          </div>
          <div className="flex flex-col gap-3 md:gap-0">
            {customers?.map((c: any) => (
              <CustomerRow key={c.id} customer={c} onUpdate={updateCustomerRole} />
            ))}
          </div>

          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 border border-border rounded-[6px] text-[13px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              Anterior
            </button>
            <span className="px-3 py-2 border border-transparent rounded-[6px] text-[13px] bg-yellow-500 text-black font-semibold">
              {page}
            </span>
            <button
              disabled={page * 20 >= customersTotal}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 border border-border rounded-[6px] text-[13px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              Próxima
            </button>
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
    <div className="flex flex-col md:grid md:grid-cols-12 gap-4 p-4 md:p-3 bg-card md:bg-transparent rounded-[12px] md:rounded-none shadow-sm md:shadow-none border border-border md:border-t-0 hover:bg-muted/50 transition-colors md:items-center">
      <div className="md:col-span-4">
        <span className="md:hidden font-bold text-[14px] block mb-1">Nome</span>
        <span className="font-normal text-[14px]">{customer.full_name || 'Sem Nome'}</span>
      </div>
      <div className="md:col-span-3">
        <span className="md:hidden font-bold text-[14px] block mb-1">Email</span>
        <span className="text-[14px]">{customer.email}</span>
      </div>
      <div className="md:col-span-2">
        <span className="md:hidden font-bold text-[14px] block mb-1">Role Atual</span>
        <span
          className={`px-3 py-1 rounded-[20px] text-[11px] font-semibold ${roleColors[customer.role] || roleColors.customer}`}
        >
          {customer.role}
        </span>
      </div>
      <div className="md:col-span-3 flex flex-wrap items-center gap-2">
        <span className="md:hidden font-bold text-[14px] w-full block mb-1">Ação</span>
        <Select value={editingRole} onValueChange={setEditingRole}>
          <SelectTrigger className="w-[140px] border border-border rounded-[6px] text-[13px] py-2 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500">
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
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-[40px] h-[40px] flex items-center justify-center bg-green-600 text-white rounded-[6px] hover:bg-green-700 hover:scale-105 transition-all duration-150 disabled:opacity-50"
              title="Salvar"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={() => setEditingRole(customer.role)}
              disabled={isSaving}
              className="w-[40px] h-[40px] flex items-center justify-center bg-gray-600 text-white rounded-[6px] hover:bg-gray-700 hover:scale-105 transition-all duration-150 disabled:opacity-50"
              title="Cancelar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
