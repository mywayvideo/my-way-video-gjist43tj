import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { DashboardAdminCustomers } from './admin/DashboardAdminCustomers'
import { DashboardAdminDiscounts } from './admin/DashboardAdminDiscounts'
import { DashboardAdminMetrics } from './admin/DashboardAdminMetrics'
import { DashboardAdminProfile } from './admin/DashboardAdminProfile'
import { useAdminDashboard } from '@/hooks/useAdminDashboard'

export default function DashboardAdmin() {
  const [activeTab, setActiveTab] = useState(0)
  const dashboardParams = useAdminDashboard()

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
            'Dados Pessoais',
            'Gerenciar Clientes',
            'Gerenciar Descontos',
            'Metricas e Relatorios',
          ].map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={cn(
                'whitespace-nowrap px-[24px] py-[16px] text-[14px] font-medium transition-all duration-300 border-b-[4px] outline-none min-w-[120px] text-center',
                activeTab === idx
                  ? 'border-yellow-500 text-white bg-yellow-500/10'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-muted cursor-pointer',
              )}
            >
              {tab}
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
        {activeTab === 2 && <DashboardAdminDiscounts {...dashboardParams} />}
        {activeTab === 3 && <DashboardAdminMetrics {...dashboardParams} />}
      </main>
    </div>
  )
}
