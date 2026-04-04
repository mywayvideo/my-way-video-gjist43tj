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
import {
  LayoutDashboard,
  DollarSign,
  Truck,
  User,
  ArrowLeft,
  Settings,
  Tag,
  Box,
  Bot,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function AdminSidebar() {
  return (
    <Sidebar className="border-r border-zinc-800 bg-[#0a0a0a] text-zinc-50">
      <SidebarHeader className="p-4 flex items-center gap-3">
        <div className="flex items-center gap-3 w-full">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0">
            <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-bold leading-tight tracking-tight uppercase">
              My Way <span className="text-orange-500">Video</span>
            </h2>
            <span className="text-[10px] text-zinc-400 tracking-wider">
              PROFESSIONAL AUDIOVISUAL SHOP
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <div className="px-4 py-3 flex items-center gap-2 text-sm font-bold text-zinc-100 bg-zinc-900/80 rounded-lg mx-3 mb-4 shadow-sm border border-zinc-800/50">
            <LayoutDashboard className="h-4 w-4" /> Admin Panel
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5 px-3">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50 transition-colors h-10 rounded-md',
                  )}
                >
                  <Link to="/admin">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50 transition-colors h-10 rounded-md',
                  )}
                >
                  <Link to="/admin/ai">
                    <Bot className="mr-2 h-4 w-4" /> IA & Inteligência Artificial
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50 transition-colors h-10 rounded-md',
                  )}
                >
                  <Link to="/admin/catalog">
                    <Box className="mr-2 h-4 w-4" /> Catálogo & Produtos
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50 transition-colors h-10 rounded-md',
                  )}
                >
                  <Link to="/admin/pricing">
                    <DollarSign className="mr-2 h-4 w-4" /> Preços & Câmbio
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive
                  className="bg-zinc-800 text-zinc-50 h-10 rounded-md shadow-sm border border-zinc-700/50"
                >
                  <Link to="/admin/shipping-config">
                    <Truck className="mr-2 h-4 w-4 text-orange-500" /> Fretes & Shipping
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50 transition-colors h-10 rounded-md',
                  )}
                >
                  <Link to="/admin/discounts">
                    <Tag className="mr-2 h-4 w-4" /> Descontos & Promoções
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50 transition-colors h-10 rounded-md',
                  )}
                >
                  <Link to="/admin/settings">
                    <Settings className="mr-2 h-4 w-4" /> Configurações Globais
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-zinc-800/50">
        <div className="flex items-center gap-2 text-zinc-400">
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

              <Card className="bg-zinc-950 text-white border-zinc-800 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="font-bold text-xl flex items-center gap-2">
                    Exemplo de cálculo:
                  </CardTitle>
                  <p className="text-zinc-400">Produto US$ 199 com peso de 0.88 lb</p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-zinc-300 font-mono">
                  <p className="flex justify-between border-b border-zinc-800/50 pb-2">
                    <span>Converter peso para kg:</span>
                    <span className="text-white">0.88 / 2.204 = 0,399 kg</span>
                  </p>
                  <p className="flex justify-between border-b border-zinc-800/50 pb-2">
                    <span>Peso considerado (kg + adicional):</span>
                    <span className="text-white">0,399 + 0,5 = 0,899 kg</span>
                  </p>
                  <p className="flex justify-between border-b border-zinc-800/50 pb-2">
                    <span>Calcular frete por peso:</span>
                    <span className="text-white">0,899 kg * 120 USD = US$ 107,88</span>
                  </p>
                  <p className="flex justify-between border-b border-zinc-800/50 pb-2">
                    <span>Calcular taxa percentual (10%):</span>
                    <span className="text-white">199 * 10% = US$ 19,90</span>
                  </p>
                  <p className="flex justify-between border-b border-zinc-800/50 pb-2">
                    <span>Somar Produto + Frete + Taxa:</span>
                    <span className="text-white">199 + 107,88 + 19,90 = US$ 326,78</span>
                  </p>

                  <div className="mt-4 pt-4 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50">
                    <p className="text-xs text-zinc-400 mb-1">Câmbio + Spread (ex: 5,4655)</p>
                    <p className="font-bold text-lg text-green-400">
                      Preço BRL final: 326,78 * 5,4655 = R$ 1.786,01
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
