import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  if (error)
    return (
      <div className="text-center p-8">
        <AlertCircle className="mx-auto text-red-500 mb-2" />
        <p>{error}</p>
        <Button onClick={fetchMetrics} className="mt-4">
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Clientes"
          value={metrics.totalCustomers}
          subtext={`vip: ${metrics.customersByRole.vip || 0}, reseller: ${metrics.customersByRole.reseller || 0}`}
          icon={<Users />}
        />
        <MetricCard
          title="Total de Pedidos"
          value={metrics.totalOrders}
          subtext={`Mês de ${currentMonthName}`}
          icon={<ShoppingCart />}
        />
        <MetricCard
          title="Receita Total"
          value={`R$ ${metrics.totalRevenue.toFixed(2)}`}
          subtext={`Mês de ${currentMonthName}`}
          icon={<DollarSign />}
        />
        <MetricCard
          title="Descontos Aplicados"
          value={`R$ ${metrics.totalDiscounts.toFixed(2)}`}
          subtext="Total economizado pelos clientes"
          icon={<TrendingDown />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Clientes por Role</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
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
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendas por Mês (últimos 12 meses)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <LineChart data={metrics.salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(v) => `R$${v}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="var(--color-total)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ title, value, subtext, icon }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground w-4 h-4">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      </CardContent>
    </Card>
  )
}
