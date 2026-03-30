import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { DashboardAdminCustomers } from './admin/DashboardAdminCustomers'
import { DashboardAdminDiscounts } from './admin/DashboardAdminDiscounts'
import { DashboardAdminMetrics } from './admin/DashboardAdminMetrics'
import { useAdminDashboard } from '@/hooks/useAdminDashboard'

export default function DashboardAdmin() {
  const [activeTab, setActiveTab] = useState(0)
  const dashboardParams = useAdminDashboard()

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="pt-8 pb-4 px-6 md:px-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Admin</h1>
        <p className="text-muted-foreground mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <p className="text-lg mt-2 font-medium">Olá, Admin!</p>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="flex overflow-x-auto border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10 px-6 md:px-8 scrollbar-hide">
          {['Gerenciar Roles', 'Gerenciar Descontos', 'Métricas e Relatórios'].map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={cn(
                'whitespace-nowrap px-6 py-4 font-medium transition-colors border-b-2 outline-none',
                activeTab === idx
                  ? 'border-yellow-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200',
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <main className="p-6 md:px-8 mt-4 animate-fade-in-up">
          {activeTab === 0 && <DashboardAdminCustomers {...dashboardParams} />}
          {activeTab === 1 && <DashboardAdminDiscounts {...dashboardParams} />}
          {activeTab === 2 && <DashboardAdminMetrics {...dashboardParams} />}
        </main>
      </div>
    </div>
  )
}
