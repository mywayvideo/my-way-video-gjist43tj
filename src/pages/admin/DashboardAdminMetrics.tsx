import { useEffect } from 'react'
import { Users, ShoppingCart, DollarSign, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'

const ROLE_NAMES = ['customer', 'vip', 'reseller', 'collaborator', 'admin']

const chartConfig = {
  total: { label: 'Receita', color: 'hsl(var(--primary))' },
  customer: { label: 'Customer', color: '#6b7280' },
  vip: { label: 'VIP', color: '#eab308' },
  reseller: { label: 'Reseller', color: '#3b82f6' },
  collaborator: { label: 'Collaborator', color: '#22c55e' },
  admin: { label: 'Admin', color: '#ef4444' },
}

export function DashboardAdminMetrics({ metrics, loadingMetrics, error, fetchMetrics }: any) {
  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  if (loadingMetrics)
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-[12px] w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Skeleton className="h-[300px] rounded-[12px] w-full" />
          <Skeleton className="h-[300px] rounded-[12px] w-full" />
        </div>
      </div>
    )

  if (error)
    return (
      <div className="text-center py-[48px] px-6 animate-fade-in">
        <AlertCircle className="mx-auto h-[64px] w-[64px] text-red-500 mb-4" />
        <h3 className="text-[18px] font-semibold text-foreground mb-2">
          Não foi possível carregar métricas.
        </h3>
        <p className="text-[14px] text-gray-500 mb-6">{error}</p>
        <Button
          onClick={fetchMetrics}
          className="px-6 py-[10px] bg-yellow-500 text-black font-semibold rounded-[8px] hover:bg-yellow-600 hover:scale-105 transition-all"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar Novamente
        </Button>
      </div>
    )

  if (!metrics) return null

  const currentMonthName = new Date().toLocaleString('pt-BR', { month: 'long' })

  const pieData = ROLE_NAMES.map((role) => ({
    name: role,
    value: metrics.customersByRole[role] || 0,
  })).filter((d) => d.value > 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Clientes"
          value={metrics.totalCustomers}
          subtext={`vip: ${metrics.customersByRole.vip || 0}, reseller: ${metrics.customersByRole.reseller || 0}`}
          icon={<Users className="w-12 h-12" />}
        />
        <MetricCard
          title="Total de Pedidos"
          value={metrics.totalOrders}
          subtext={`Mês de ${currentMonthName}`}
          icon={<ShoppingCart className="w-12 h-12" />}
        />
        <MetricCard
          title="Receita Total"
          value={`R$ ${metrics.totalRevenue.toFixed(2)}`}
          subtext={`Mês de ${currentMonthName}`}
          icon={<DollarSign className="w-12 h-12" />}
        />
        <MetricCard
          title="Descontos Aplicados"
          value={`R$ ${metrics.totalDiscounts.toFixed(2)}`}
          subtext="Total economizado pelos clientes"
          icon={<TrendingDown className="w-12 h-12" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-card rounded-[12px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <h3 className="text-[16px] font-semibold text-foreground mb-4">Clientes por Role</h3>
          <div className="h-[200px] md:h-[250px] lg:h-[300px]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={chartConfig[entry.name as keyof typeof chartConfig]?.color}
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend
                  content={<ChartLegendContent />}
                  className="text-[12px] text-gray-600 mt-4"
                />
              </PieChart>
            </ChartContainer>
          </div>
        </div>

        <div className="bg-card rounded-[12px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <h3 className="text-[16px] font-semibold text-foreground mb-4">
            Vendas por Mês (últimos 12 meses)
          </h3>
          <div className="h-[200px] md:h-[250px] lg:h-[300px]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <LineChart
                data={metrics.salesByMonth}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => `R$${v}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="var(--color-total)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'var(--color-total)', strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, subtext, icon }: any) {
  return (
    <div className="bg-card rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.1)] p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:scale-[1.02] transition-all duration-200">
      <div className="text-yellow-500 mb-2">{icon}</div>
      <div className="text-[12px] text-gray-500 font-medium mb-2">{title}</div>
      <div className="text-[32px] text-foreground font-bold leading-none">{value}</div>
      {subtext && <div className="text-[11px] text-gray-400 mt-2 leading-[1.4]">{subtext}</div>}
    </div>
  )
}
