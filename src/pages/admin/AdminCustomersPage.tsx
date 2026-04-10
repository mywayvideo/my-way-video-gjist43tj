import { AdminLayout } from '@/components/admin/AdminLayout'
import { DashboardAdminCustomers } from './DashboardAdminCustomers'
import { useCustomerManagement } from '@/hooks/useCustomerManagement'

export default function AdminCustomersPage() {
  const customerParams = useCustomerManagement()

  return (
    <AdminLayout breadcrumb="Gerenciar Clientes">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Clientes</h1>
          <p className="text-muted-foreground mt-2">
            Administre a base de clientes, níveis de acesso e informações.
          </p>
        </div>
        <DashboardAdminCustomers {...customerParams} />
      </div>
    </AdminLayout>
  )
}
