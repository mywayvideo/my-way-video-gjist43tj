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
          <Search className="absolute left-[12px] top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-[40px] pr-[12px] py-[10px] border border-border rounded-[8px] text-[14px] focus-visible:ring-[3px] focus-visible:ring-yellow-500/10 focus-visible:border-yellow-500 transition-all outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-[12px] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full md:w-[200px] border border-border rounded-[8px] text-[13px] py-[10px] px-[12px] focus:ring-[3px] focus:ring-yellow-500/10 focus:border-yellow-500 outline-none">
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
        <div className="text-center py-[48px] px-[24px]">
          <AlertCircle className="mx-auto text-[64px] h-[64px] w-[64px] text-gray-300 mb-[16px]" />
          <h3 className="text-[18px] font-semibold text-foreground mb-[8px]">
            Não foi possível carregar clientes.
          </h3>
          <p className="text-[14px] text-gray-500 mb-[24px]">{error}</p>
          <Button
            onClick={() => fetchCustomers(page, 20, debouncedSearch, roleFilter)}
            className="px-[24px] py-[10px] bg-yellow-500 text-black font-semibold rounded-[8px] hover:bg-yellow-600 hover:scale-105 transition-all duration-150"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Tentar Novamente
          </Button>
        </div>
      ) : loadingCustomers ? (
        <div className="space-y-[12px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[40px] rounded-[8px] w-full bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer"
            />
          ))}
        </div>
      ) : customers?.length === 0 ? (
        <div className="text-center py-[48px] px-[24px]">
          <Users className="mx-auto text-[64px] h-[64px] w-[64px] text-gray-300 mb-[16px]" />
          <h3 className="text-[18px] font-semibold text-foreground mb-[8px]">
            Nenhum cliente encontrado.
          </h3>
          <p className="text-[14px] text-gray-500 mb-[24px]">
            Tente ajustar seus filtros de busca.
          </p>
          {(searchTerm || roleFilter !== 'all') && (
            <Button
              onClick={() => {
                setSearchTerm('')
                setRoleFilter('all')
              }}
              className="px-[24px] py-[10px] bg-yellow-500 text-black font-semibold rounded-[8px] hover:bg-yellow-600 hover:scale-105 transition-all duration-150"
            >
              Limpar Filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="w-full">
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="p-[12px] font-semibold text-[14px]">Nome</th>
                  <th className="p-[12px] font-semibold text-[14px]">Email</th>
                  <th className="p-[12px] font-semibold text-[14px]">Role Atual</th>
                  <th className="p-[12px] font-semibold text-[14px]">Ação</th>
                </tr>
              </thead>
              <tbody>
                {customers?.map((c: any) => (
                  <CustomerRow
                    key={c.id}
                    customer={c}
                    onUpdate={updateCustomerRole}
                    isMobile={false}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col md:hidden">
            {customers?.map((c: any) => (
              <CustomerRow key={c.id} customer={c} onUpdate={updateCustomerRole} isMobile={true} />
            ))}
          </div>

          <div className="flex justify-center items-center gap-[8px] mt-[24px]">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-[16px] py-[8px] border border-border rounded-[6px] text-[13px] hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="px-[12px] py-[8px] border border-border rounded-[6px] text-[13px] bg-yellow-500 text-black font-semibold">
              {page}
            </span>
            <button
              disabled={page * 20 >= customersTotal}
              onClick={() => setPage((p) => p + 1)}
              className="px-[16px] py-[8px] border border-border rounded-[6px] text-[13px] hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CustomerRow({ customer, onUpdate, isMobile }: any) {
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

  const actions = (
    <div className="flex flex-wrap items-center gap-[8px]">
      <Select value={editingRole} onValueChange={setEditingRole}>
        <SelectTrigger className="w-[140px] px-[12px] py-[8px] border border-border rounded-[6px] text-[13px] focus:ring-[3px] focus:ring-yellow-500/10 focus:border-yellow-500 outline-none">
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
        <div className="flex gap-[8px]">
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
  )

  const roleBadge = (
    <span
      className={`px-[12px] py-[4px] rounded-[20px] text-[11px] font-semibold ${roleColors[customer.role] || roleColors.customer}`}
    >
      {customer.role}
    </span>
  )

  if (isMobile) {
    return (
      <div className="bg-card border border-border rounded-[12px] p-[16px] mb-[12px]">
        <div className="mb-2">
          <span className="font-bold text-[14px]">Nome:</span>{' '}
          <span className="text-[14px]">{customer.full_name || 'Sem Nome'}</span>
        </div>
        <div className="mb-2">
          <span className="font-bold text-[14px]">Email:</span>{' '}
          <span className="text-[14px]">{customer.email}</span>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <span className="font-bold text-[14px]">Role Atual:</span> {roleBadge}
        </div>
        <div className="mt-1">
          <span className="font-bold text-[14px] block mb-2">Ação:</span>
          {actions}
        </div>
      </div>
    )
  }

  return (
    <tr className="border-b border-border hover:bg-muted transition-colors">
      <td className="p-[12px] text-[14px]">{customer.full_name || 'Sem Nome'}</td>
      <td className="p-[12px] text-[14px]">{customer.email}</td>
      <td className="p-[12px]">{roleBadge}</td>
      <td className="p-[12px]">{actions}</td>
    </tr>
  )
}
