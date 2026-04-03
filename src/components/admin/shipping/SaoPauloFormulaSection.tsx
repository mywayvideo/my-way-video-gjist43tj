import { useState, useRef } from 'react'
import { SaoPauloFormula } from '@/hooks/useShippingConfig'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface Props {
  formula: SaoPauloFormula
  setFormula: (f: SaoPauloFormula) => void
  onSave: (f: SaoPauloFormula) => Promise<boolean>
}

export function SaoPauloFormulaSection({ formula, setFormula, onSave }: Props) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleSave = () => {
    if (formula.weight_price_per_kg < 0 || formula.value_percentage < 0) {
      toast({ title: 'Valores devem ser positivos.', variant: 'destructive' })
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    setIsSaving(true)

    timerRef.current = setTimeout(async () => {
      const success = await onSave({
        weight_price_per_kg: Number(formula.weight_price_per_kg.toFixed(2)),
        value_percentage: Number(formula.value_percentage.toFixed(2)),
      })
      setIsSaving(false)
      if (success) {
        toast({ title: 'Formula de frete atualizada com sucesso!' })
      } else {
        toast({ title: 'Erro ao processar. Tente novamente.', variant: 'destructive' })
      }
    }, 500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Frete Internacional (Sao Paulo)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Preco por kg (USD)</Label>
            <Input
              type="number"
              step="0.01"
              value={formula.weight_price_per_kg}
              onChange={(e) =>
                setFormula({ ...formula, weight_price_per_kg: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Percentual sobre valor (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={formula.value_percentage}
              onChange={(e) =>
                setFormula({ ...formula, value_percentage: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </div>
        <div className="p-3 bg-secondary/50 rounded text-sm text-muted-foreground">
          Formula: Frete = (Valor Total x {formula.value_percentage}%) + (Peso Total x{' '}
          {formula.weight_price_per_kg})
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          Salvar Formula
        </Button>
      </CardContent>
    </Card>
  )
}
