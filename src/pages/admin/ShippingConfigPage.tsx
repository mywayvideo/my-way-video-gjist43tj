import { useShippingConfig } from '@/hooks/useShippingConfig'
import { WarehouseSection } from '@/components/admin/shipping/WarehouseSection'
import { MiamiRangesSection } from '@/components/admin/shipping/MiamiRangesSection'
import { SaoPauloFormulaSection } from '@/components/admin/shipping/SaoPauloFormulaSection'
import { Skeleton } from '@/components/ui/skeleton'

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
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-[300px]" />
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Configuracao de Fretes</h1>
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
      <SaoPauloFormulaSection
        formula={spFormula}
        setFormula={setSpFormula}
        onSave={(val) => saveSetting('shipping_sao_paulo_formula', val)}
      />
    </div>
  )
}
