import { useShippingConfig } from '@/hooks/useShippingConfig'
import { WarehouseSection } from '@/components/admin/shipping/WarehouseSection'
import { MiamiRangesSection } from '@/components/admin/shipping/MiamiRangesSection'
import { SaoPauloFormulaSection } from '@/components/admin/shipping/SaoPauloFormulaSection'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar'
import { LayoutDashboard, DollarSign, Truck, User, ArrowLeft, Settings, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

function AdminSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <h2 className="text-lg font-bold">My Way Admin</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/admin">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/admin/pricing">
                    <DollarSign className="mr-2 h-4 w-4" /> Pricing
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive>
                  <Link to="/admin/shipping-config">
                    <Truck className="mr-2 h-4 w-4" /> Shipping Config
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/admin/discounts">
                    <Tag className="mr-2 h-4 w-4" /> Discounts
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/admin/settings">
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="text-sm font-medium">Admin Profile</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

export default function ShippingConfigPage() {
  const {
    warehouse,
    setWarehouse,
    miamiRanges,
    setMiamiRanges,
    spFormula,
    setSpFormula,
    isLoading,
    saveSetting,
  } = useShippingConfig()

  if (isLoading) {
    return (
      <SidebarProvider>
        <AdminSidebar />
        <div className="flex flex-1 flex-col w-full">
          <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
            <Skeleton className="h-10 w-[300px]" />
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <div className="flex flex-1 flex-col w-full h-screen overflow-hidden">
        <header className="flex items-center gap-2 border-b px-4 py-3 bg-background">
          <SidebarTrigger />
          <Button variant="ghost" size="icon" asChild className="md:hidden">
            <Link to="/admin">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold tracking-tight">Configuracao de Frete</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6 max-w-5xl mx-auto">
            <WarehouseSection
              warehouse={warehouse}
              setWarehouse={setWarehouse}
              onSave={(val) => saveSetting('warehouse_location', val)}
            />
            <MiamiRangesSection
              ranges={miamiRanges}
              setRanges={setMiamiRanges}
              onSave={(val) => saveSetting('shipping_miami_ranges', val)}
            />

            <div className="space-y-6">
              <SaoPauloFormulaSection />

              <Card className="bg-zinc-900 text-white border-zinc-800">
                <CardHeader>
                  <CardTitle className="font-bold text-xl">Exemplo de calculo:</CardTitle>
                  <p className="text-zinc-400">Produto US$ 199 com peso 0.88 lb</p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Converter peso para kg: (0.88 + 0,5) / 2.204 = 0,626 kg</p>
                  <p>Calcular frete em USD: 0,626 kg * 120 USD/kg = US$ 75,12</p>
                  <p>Somar preco + frete (ambos em USD): 199 + 75,12 = US$ 274,12</p>
                  <p>Aplicar markup: 274,12 / 0,9 = US$ 304,58</p>
                  <p>Converter para reais: Taxa efetiva = 5,2655 + 0,2 = 5,4655</p>

                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <p className="font-bold text-base text-green-400">
                      Preco BRL final: 304,58 * 5,4655 = R$ 1.664,68
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
