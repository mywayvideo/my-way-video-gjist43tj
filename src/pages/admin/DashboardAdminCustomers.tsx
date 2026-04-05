import { useState, useEffect, useRef } from 'react'
import { useCustomerManagement } from '@/hooks/useCustomerManagement'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Search, Edit, Trash2, KeyRound, ShieldOff, Mail, Plus, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import { useIsMobile } from '@/hooks/use-mobile'
import { useNavigate } from 'react-router-dom'

const Field = ({ l, children }: { l: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label>{l}</Label>
    {children}
  </div>
)

export function DashboardAdminCustomers(props: any) {
  const {
    customers,
    totalCount,
    loading,
    error,
    selectedCustomer,
    setSelectedCustomer,
    fetchCustomers,
    updateCustomer,
    changeCustomerPassword,
    deleteCustomer,
    resetCustomer2FA,
    sendConfirmationEmail,
    createCustomer,
    updateBillingAddress,
    updateShippingAddress,
  } = useCustomerManagement()

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const limit = 20
  const isMobile = useIsMobile()

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    console.log('Fetching customers from Supabase...')
    fetchCustomers(page, limit, debouncedSearch, statusFilter)
  }, [page, debouncedSearch, statusFilter, fetchCustomers])

  useEffect(() => {
    const debugRLS = async () => {
      console.log('DashboardAdminCustomers component mounted')
      const {
        data: { session },
      } = await supabase.auth.getSession()
      console.log('Current user ID: ' + session?.user?.id)
      console.log(
        'Current user role: ' +
          (session?.user?.app_metadata?.role || session?.user?.user_metadata?.role),
      )
    }
    debugRLS()
  }, [])

  const prevLoading = useRef(true)
  useEffect(() => {
    if (prevLoading.current && !loading) {
      if (error) {
        console.log('Fetch error: ' + ((error as any).message || error))
        if ((error as any).code) console.log('Error code: ' + (error as any).code)
      } else {
        console.log('Customers loaded: ' + customers.length)
      }
    }
    prevLoading.current = loading
  }, [loading, error, customers])

  useEffect(() => {
    if (error) {
      toast.error('Erro ao carregar clientes. Tente novamente.', {
        action: {
          label: 'Tentar novamente',
          onClick: () => fetchCustomers(page, limit, debouncedSearch, statusFilter),
        },
      })
    }
  }, [error, page, limit, debouncedSearch, statusFilter, fetchCustomers])

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: 'customer',
    status: 'ativo',
    password: '',
    confirmPassword: '',
    sendEmail: true,
  })
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
    sendEmail: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [activeTab, setActiveTab] = useState('basic')
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([])
  const [addressForm, setAddressForm] = useState<any>(null)
  const navigate = useNavigate()

  const loadAddresses = async (customerId: string) => {
    const { data } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customerId)
    if (data) setCustomerAddresses(data)
  }

  const handleCheckoutAssistido = (e: React.MouseEvent, customerId: string) => {
    const url = `/admin/checkout-assistido/${customerId}`
    if (e.ctrlKey || e.shiftKey || e.metaKey) {
      window.open(url, '_blank')
    } else {
      navigate(url)
    }
  }

  const handleEditClick = (customer: any) => {
    setSelectedCustomer(customer)
    setEditForm({
      full_name: customer.full_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      company_name: customer.company_name || '',
      role: customer.role || 'customer',
      status: customer.status || 'ativo',
    })
    loadAddresses(customer.id)
    setAddressForm(null)
    setActiveTab('basic')
    setIsEditModalOpen(true)
  }

  const actionWrapper = async (fn: () => Promise<void>) => {
    setIsSubmitting(true)
    try {
      await fn()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateCustomer = () =>
    actionWrapper(async () => {
      if (!createForm.name || !createForm.email || !createForm.password) {
        toast.error('Preencha todos os campos obrigatórios.')
        return
      }
      if (createForm.password.length < 8) {
        toast.error('Senha deve ter no mínimo 8 caracteres.')
        return
      }
      if (createForm.password !== createForm.confirmPassword) {
        toast.error('As senhas não coincidem.')
        return
      }

      await createCustomer({
        name: createForm.name,
        email: createForm.email,
        phone: createForm.phone,
        company: createForm.company,
        role: createForm.role,
        status: createForm.status,
        password: createForm.password,
        sendEmail: createForm.sendEmail,
      })

      setIsCreateModalOpen(false)
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        company: '',
        role: 'customer',
        status: 'ativo',
        password: '',
        confirmPassword: '',
        sendEmail: true,
      })
      setPage(1)
      fetchCustomers(1, limit, debouncedSearch, statusFilter)
    })

  const handleSaveAddress = () =>
    actionWrapper(async () => {
      if (!addressForm) return
      const form = addressForm
      if (
        form.zip_code &&
        (form.country === 'Brasil' || form.country === 'Brazil') &&
        !/^\d{5}-\d{3}$/.test(form.zip_code)
      )
        return

      const normalizeStr = (str: string | null) =>
        str
          ? str
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim()
          : ''

      // Auto lookup lat/lng if USA/Miami or Brasil
      let lat = form.latitude,
        lng = form.longitude
      try {
        const cleanZip = form.zip_code.replace(/\D/g, '')
        if (cleanZip) {
          const { data } = await supabase.functions.invoke('lookup-address', {
            body: { cep_or_zip: cleanZip, country: form.country },
          })
          if (data && data.latitude !== null && data.latitude !== undefined) {
            lat = data.latitude
            lng = data.longitude

            // Optionally autofill missing fields if API returns them
            if (!form.city && data.city) form.city = data.city
            if (!form.state && data.state) form.state = data.state
          }
        }
      } catch (e) {
        console.error('Geocoding fetch failed during admin address save', e)
      }

      const payload = {
        customer_id: selectedCustomer.id,
        address_type: form.address_type || 'shipping',
        street: form.street,
        number: form.number || 'S/N',
        complement: form.complement,
        neighborhood: form.neighborhood || 'N/A',
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        country: form.country || 'USA',
        latitude: lat,
        longitude: lng,
        is_default: form.is_default || false,
      }

      if (form.id) {
        await supabase.from('customer_addresses').update(payload).eq('id', form.id)
      } else {
        await supabase.from('customer_addresses').insert(payload)
      }

      toast.success('Endereço salvo com sucesso')
      setAddressForm(null)
      loadAddresses(selectedCustomer.id)
    })

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Deseja excluir este endereço?')) return
    await supabase.from('customer_addresses').delete().eq('id', id)
    toast.success('Endereço excluído')
    loadAddresses(selectedCustomer.id)
  }

  const handleSaveEdit = () =>
    actionWrapper(async () => {
      if (!editForm.full_name || !editForm.email) return
      await updateCustomer(selectedCustomer.id, editForm)
      setIsEditModalOpen(false)
      fetchCustomers(page, limit, debouncedSearch, statusFilter)
    })

  const confirmDelete = () =>
    actionWrapper(async () => {
      await deleteCustomer(selectedCustomer.id)
      setIsDeleteDialogOpen(false)
      fetchCustomers(page, limit, debouncedSearch, statusFilter)
    })

  const handleSavePassword = () =>
    actionWrapper(async () => {
      if (
        passwordForm.newPassword !== passwordForm.confirmPassword ||
        passwordForm.newPassword.length < 8
      )
        return
      await changeCustomerPassword(
        selectedCustomer.id,
        passwordForm.newPassword,
        passwordForm.sendEmail,
      )
      setIsPasswordModalOpen(false)
      setPasswordForm({ newPassword: '', confirmPassword: '', sendEmail: true })
    })

  const getBadge = (val: string, type: 'role' | 'status') => {
    const map: any =
      type === 'role'
        ? {
            customer: 'bg-gray-500',
            vip: 'bg-yellow-500',
            reseller: 'bg-blue-500',
            collaborator: 'bg-green-500',
            admin: 'bg-red-500',
          }
        : { ativo: 'bg-green-500', inativo: 'bg-gray-500', suspenso: 'bg-red-500' }
    return <Badge className={`${map[val] || 'bg-gray-500'} text-white`}>{val?.toUpperCase()}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="suspenso">Suspenso</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> Criar Novo Cliente
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {isMobile ? (
          <div className="grid gap-4 p-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))
            ) : customers.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center justify-center space-y-4">
                <p className="text-muted-foreground">Nenhum cliente encontrado</p>
                <Button
                  variant="outline"
                  onClick={() => fetchCustomers(page, limit, debouncedSearch, statusFilter)}
                >
                  Atualizar
                </Button>
              </div>
            ) : (
              customers.map((c) => (
                <div key={c.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{c.full_name || 'Sem nome'}</p>
                      <p className="text-sm text-muted-foreground">{c.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(c)}>
                        <Edit className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleCheckoutAssistido(e, c.id)}
                        title="Checkout Assistido"
                        className="hover:bg-green-50"
                      >
                        <ShoppingCart className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedCustomer(c)
                          setIsDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getBadge(c.role, 'role')}
                    {getBadge(c.status, 'status')}
                  </div>
                  <p className="text-sm text-muted-foreground">{c.phone || '-'}</p>
                </div>
              ))
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <p className="text-muted-foreground">Nenhum cliente encontrado</p>
                      <Button
                        variant="outline"
                        onClick={() => fetchCustomers(page, limit, debouncedSearch, statusFilter)}
                      >
                        Atualizar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name || 'Sem nome'}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{getBadge(c.role, 'role')}</TableCell>
                    <TableCell>{getBadge(c.status, 'status')}</TableCell>
                    <TableCell>{c.phone || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(c)}>
                        <Edit className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleCheckoutAssistido(e, c.id)}
                        title="Checkout Assistido"
                        className="hover:bg-green-50"
                      >
                        <ShoppingCart className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedCustomer(c)
                          setIsDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
        {!loading && !error && totalCount > limit && (
          <div className="p-4 border-t flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total: {totalCount}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * limit >= totalCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">1. Informações Básicas</h3>
              <Field l="Nome Completo *">
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  maxLength={100}
                />
              </Field>
              <Field l="Email *">
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </Field>
              <Field l="Telefone">
                <Input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                />
              </Field>
              <Field l="Empresa">
                <Input
                  value={createForm.company}
                  onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
                  maxLength={100}
                />
              </Field>
            </div>
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">2. Acesso e Permissões</h3>
                <Field l="Role *">
                  <Select
                    value={createForm.role}
                    onValueChange={(v) => setCreateForm({ ...createForm, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="reseller">Reseller</SelectItem>
                      <SelectItem value="collaborator">Collaborator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field l="Status *">
                  <Select
                    value={createForm.status}
                    onValueChange={(v) => setCreateForm({ ...createForm, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">3. Senha Inicial</h3>
                <Field l="Senha Inicial *">
                  <Input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                  />
                </Field>
                <Field l="Confirmar Senha *">
                  <Input
                    type="password"
                    value={createForm.confirmPassword}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, confirmPassword: e.target.value })
                    }
                  />
                </Field>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="sendWelcomeEmail"
                    checked={createForm.sendEmail}
                    onCheckedChange={(c) => setCreateForm({ ...createForm, sendEmail: c === true })}
                  />
                  <Label htmlFor="sendWelcomeEmail">Enviar email ao cliente com credenciais</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCustomer}
              disabled={
                isSubmitting || !createForm.name || !createForm.email || !createForm.password
              }
              className="bg-green-600 hover:bg-green-700"
            >
              Criar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente: {selectedCustomer?.full_name}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 border-b mt-2">
            {[
              { id: 'basic', label: 'Informações Básicas' },
              { id: 'access', label: 'Acesso e Permissões' },
              { id: 'addresses', label: 'Endereços' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-yellow-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="animate-fade-in transition-opacity duration-300 py-4 min-h-[400px]">
            {activeTab === 'basic' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Informações Básicas</h3>
                  <Field l="Nome Completo">
                    <Input
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      maxLength={100}
                    />
                  </Field>
                  <Field l="Email">
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </Field>
                  <Field l="Telefone">
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </Field>
                  <Field l="Empresa">
                    <Input
                      value={editForm.company_name}
                      onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                      maxLength={100}
                    />
                  </Field>
                  <Field l="Data de Criação">
                    <Input
                      value={
                        selectedCustomer?.created_at
                          ? format(new Date(selectedCustomer.created_at), 'dd/MM/yyyy HH:mm')
                          : '-'
                      }
                      disabled
                    />
                  </Field>
                </div>
              </div>
            )}

            {activeTab === 'access' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Acesso e Permissões</h3>
                  <Field l="Role">
                    <Select
                      value={editForm.role}
                      onValueChange={(v) => setEditForm({ ...editForm, role: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="reseller">Reseller</SelectItem>
                        <SelectItem value="collaborator">Collaborator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field l="Status">
                    <Select
                      value={editForm.status}
                      onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="suspenso">Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field l="Último Acesso">
                    <Input
                      value={
                        selectedCustomer?.last_login
                          ? format(new Date(selectedCustomer.last_login), 'dd/MM/yyyy HH:mm')
                          : 'Nunca acessou'
                      }
                      disabled
                    />
                  </Field>
                </div>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Alterar Senha</h3>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setIsPasswordModalOpen(true)}
                    >
                      <KeyRound className="mr-2 h-4 w-4" /> Alterar Senha do Cliente
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Ações Adicionais</h3>
                    {selectedCustomer?.two_factor_enabled && (
                      <Button
                        variant="outline"
                        className="w-full text-orange-500"
                        onClick={() => {
                          if (window.confirm('Desativar autenticação de dois fatores?'))
                            resetCustomer2FA(selectedCustomer.id)
                        }}
                      >
                        <ShieldOff className="mr-2 h-4 w-4" /> Resetar 2FA
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => sendConfirmationEmail(selectedCustomer.id)}
                    >
                      <Mail className="mr-2 h-4 w-4" /> Enviar Email de Confirmação
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="space-y-4">
                {!addressForm ? (
                  <>
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="font-semibold text-lg">Endereços Cadastrados</h3>
                      <Button
                        size="sm"
                        onClick={() =>
                          setAddressForm({ country: 'Brasil', address_type: 'shipping' })
                        }
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Novo
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {customerAddresses.length === 0 && (
                        <p className="text-muted-foreground text-sm col-span-2">
                          Nenhum endereço cadastrado.
                        </p>
                      )}
                      {customerAddresses.map((addr) => (
                        <div
                          key={addr.id}
                          className="p-4 border rounded-lg bg-card shadow-sm flex flex-col gap-1.5 relative group hover:border-primary/50 transition-colors"
                        >
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setAddressForm(addr)}
                            >
                              <Edit className="w-3.5 h-3.5 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDeleteAddress(addr.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={addr.address_type === 'billing' ? 'secondary' : 'default'}
                              className="text-[10px] h-5"
                            >
                              {addr.address_type === 'billing' ? 'Cobrança' : 'Entrega'}
                            </Badge>
                            {addr.latitude && addr.longitude && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 font-mono text-muted-foreground"
                              >
                                Geolocalizado
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-sm pr-16 leading-tight">
                            {addr.street}, {addr.number}{' '}
                            {addr.complement ? `- ${addr.complement}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {addr.neighborhood && addr.neighborhood !== 'N/A'
                              ? `${addr.neighborhood} • `
                              : ''}
                            {addr.city}/{addr.state}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium">
                            CEP/ZIP: {addr.zip_code} • {addr.country}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  (() => {
                    const form = addressForm
                    const setForm = setAddressForm
                    const isBr = form.country === 'Brasil' || form.country === 'Brazil'
                    const cepErr =
                      isBr && form.zip_code ? !/^\d{5}-\d{3}$/.test(form.zip_code) : false

                    return (
                      <div className="space-y-4 border p-4 rounded-lg bg-muted/10">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-semibold">
                            {form.id ? 'Editar Endereço' : 'Novo Endereço'}
                          </h4>
                          <Button variant="ghost" size="sm" onClick={() => setAddressForm(null)}>
                            Cancelar
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Field l="Tipo de Endereço">
                            <Select
                              value={form.address_type || 'shipping'}
                              onValueChange={(v) => setForm({ ...form, address_type: v })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="shipping">Entrega</SelectItem>
                                <SelectItem value="billing">Cobrança</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field l="País">
                            <Input
                              value={form.country || ''}
                              onChange={(e) => setForm({ ...form, country: e.target.value })}
                            />
                          </Field>
                          <Field l="CEP / ZIP">
                            <Input
                              value={form.zip_code || ''}
                              onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                              className={cepErr ? 'border-red-500' : ''}
                            />
                            {cepErr && (
                              <span className="text-xs text-red-500">Formato inválido</span>
                            )}
                          </Field>
                          <Field l="Rua / Avenida">
                            <Input
                              value={form.street || ''}
                              onChange={(e) => setForm({ ...form, street: e.target.value })}
                            />
                          </Field>
                          <div className="flex gap-4">
                            <div className="w-1/3">
                              <Field l="Número">
                                <Input
                                  value={form.number || ''}
                                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                                />
                              </Field>
                            </div>
                            <div className="w-2/3">
                              <Field l="Complemento">
                                <Input
                                  value={form.complement || ''}
                                  onChange={(e) => setForm({ ...form, complement: e.target.value })}
                                />
                              </Field>
                            </div>
                          </div>
                          <Field l="Bairro">
                            <Input
                              value={form.neighborhood || ''}
                              onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                            />
                          </Field>
                          <Field l="Cidade">
                            <Input
                              value={form.city || ''}
                              onChange={(e) => setForm({ ...form, city: e.target.value })}
                            />
                          </Field>
                          <Field l="Estado / UF">
                            <Input
                              value={form.state || ''}
                              onChange={(e) => setForm({ ...form, state: e.target.value })}
                            />
                          </Field>
                        </div>
                        <div className="flex justify-end pt-4">
                          <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={handleSaveAddress}
                            disabled={isSubmitting || cepErr || !form.street || !form.city}
                          >
                            Salvar Endereço
                          </Button>
                        </div>
                      </div>
                    )
                  })()
                )}
              </div>
            )}
          </div>

          {(activeTab === 'basic' || activeTab === 'access') && (
            <DialogFooter className="flex-col sm:flex-row gap-2 mt-4 border-t pt-4">
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="sm:mr-auto"
              >
                Deletar Cliente
              </Button>
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isSubmitting || !editForm.full_name || !editForm.email}
                className="bg-green-600 hover:bg-green-700"
              >
                Salvar Alterações
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar este cliente? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isSubmitting}>
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha do Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Field l="Nova Senha">
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
            </Field>
            <Field l="Confirmar Senha">
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
              />
            </Field>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="sendEmail"
                checked={passwordForm.sendEmail}
                onCheckedChange={(c) => setPasswordForm({ ...passwordForm, sendEmail: c === true })}
              />
              <Label htmlFor="sendEmail">Enviar email informando nova senha</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSavePassword}
              disabled={
                isSubmitting ||
                passwordForm.newPassword.length < 8 ||
                passwordForm.newPassword !== passwordForm.confirmPassword
              }
            >
              Salvar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
