import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Loader2, RefreshCw } from 'lucide-react'

export default function PricingSettings() {
  const [rateData, setRateData] = useState<any>(null)
  const [now, setNow] = useState(new Date())
  const [updating, setUpdating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRate()
    const interval = setInterval(() => {
      setNow(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchRate = async () => {
    try {
      const { data, error } = await supabase.from('exchange_rate').select('*').limit(1).single()
      if (error && error.code !== 'PGRST116') throw error
      if (data) {
        setRateData(data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      const { error } = await supabase.functions.invoke('update-exchange-rate')
      if (error) throw error
      await fetchRate()
      toast({ title: 'Taxa atualizada com sucesso' })
      setNow(new Date())
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao atualizar taxa. Tente novamente em 15 minutos.',
        variant: 'destructive',
      })
    } finally {
      setUpdating(false)
    }
  }

  let diffMinutes = 0
  let isCached = false
  let nextUpdateMinutes = 15

  if (rateData?.last_updated) {
    const lastUpdated = new Date(rateData.last_updated)
    const diffMs = Math.max(0, now.getTime() - lastUpdated.getTime())
    diffMinutes = Math.floor(diffMs / 60000)

    if (diffMinutes < 10) {
      isCached = true
      nextUpdateMinutes = Math.max(1, 15 - diffMinutes)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const date = d.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const time = d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    return `${date} ${time}`
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
      <h1 className="text-3xl font-bold mb-8 text-foreground">Configurações de Preços</h1>

      <div className="space-y-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-xl">Taxa de Câmbio (USD para BRL)</CardTitle>
              <CardDescription>
                Gerenciamento da taxa de câmbio utilizada para conversão de preços.
              </CardDescription>
            </div>
            <Button
              onClick={handleUpdate}
              disabled={updating || loading}
              variant="outline"
              className="gap-2"
            >
              {updating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Atualizar Taxa Agora
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : rateData ? (
              <div className="space-y-3 mt-4 text-base">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">Taxa de Cambio:</span>
                  <span>{formatCurrency(rateData.usd_to_brl)}</span>
                  <Badge
                    className={
                      isCached
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white border-transparent'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent'
                    }
                  >
                    {isCached ? 'CACHE' : 'ATUALIZADA'}
                  </Badge>
                </div>
                <div>
                  <span className="font-semibold">Status:</span>{' '}
                  <span className="text-muted-foreground">
                    {isCached ? 'Em cache' : 'Atualizada agora'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Proxima atualizacao em:</span>{' '}
                  <span className="text-muted-foreground">
                    {isCached ? `${nextUpdateMinutes} minutos` : '15 minutos'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Ultima atualizacao:</span>{' '}
                  <span className="text-muted-foreground">
                    {formatDateTime(rateData.last_updated)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                Nenhuma taxa de câmbio configurada.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
