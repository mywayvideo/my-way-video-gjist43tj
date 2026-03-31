import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { DashboardAdminCustomers } from './admin/DashboardAdminCustomers'
import { DashboardAdminMetrics } from './admin/DashboardAdminMetrics'
import { DashboardAdminProfile } from './admin/DashboardAdminProfile'
import { useAdminDashboard } from '@/hooks/useAdminDashboard'

export default function DashboardAdmin() {
  const [activeTab, setActiveTab] = useState(0)
  const dashboardParams = useAdminDashboard()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="pt-8 pb-4 px-6 md:px-8 max-w-[1400px] mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Admin</h1>
        <p className="text-muted-foreground mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <p className="text-lg mt-2 font-medium">Olá, Admin!</p>
      </header>

      <div className="w-full bg-card border-b border-border sticky top-0 z-10">
        <div className="flex overflow-x-auto max-w-[1400px] mx-auto px-6 md:px-8 scrollbar-hide">
          {[
            { label: 'Dados Pessoais', action: () => setActiveTab(0), active: activeTab === 0 },
            { label: 'Gerenciar Clientes', action: () => setActiveTab(1), active: activeTab === 1 },
            {
              label: 'Gerenciar Descontos',
              action: () => navigate('/admin/discounts'),
              active: false,
            },
            {
              label: 'Metricas e Relatorios',
              action: () => setActiveTab(2),
              active: activeTab === 2,
            },
          ].map((tab, idx) => (
            <button
              key={idx}
              onClick={tab.action}
              className={cn(
                'whitespace-nowrap px-[24px] py-[16px] text-[14px] font-medium transition-all duration-300 border-b-[4px] outline-none min-w-[120px] text-center',
                tab.active
                  ? 'border-yellow-500 text-white bg-yellow-500/10'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-muted cursor-pointer',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main
        key={activeTab}
        className="p-[32px] max-w-[1400px] mx-auto animate-fade-in"
        style={{ animationDuration: '300ms' }}
      >
        {activeTab === 0 && <DashboardAdminProfile />}
        {activeTab === 1 && <DashboardAdminCustomers {...dashboardParams} />}
        {activeTab === 2 && <DashboardAdminMetrics {...dashboardParams} />}
      </main>
    </div>
  )
}
