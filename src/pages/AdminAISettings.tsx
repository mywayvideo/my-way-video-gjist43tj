import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAISettings, AIGlobalSettings } from '@/hooks/use-ai-settings'

export default function AdminAISettings() {
  const {
    globalSettings,
    systemPromptTemplate,
    logisticsRulesPrompt,
    loading,
    saveGlobalSettings,
    saveSystemPrompt,
    saveLogisticsRules,
  } = useAISettings()

  const [localGlobal, setLocalGlobal] = useState<AIGlobalSettings | null>(null)
  const [localPrompt, setLocalPrompt] = useState('')
  const [localLogistics, setLocalLogistics] = useState('')

  const [savingGlobal, setSavingGlobal] = useState(false)
  const [savingPrompt, setSavingPrompt] = useState(false)
  const [savingLogistics, setSavingLogistics] = useState(false)

  useEffect(() => {
    if (globalSettings) {
      const restored = { ...globalSettings }
      if (!restored.search_algorithm_sql) {
        restored.search_algorithm_sql =
          "WITH search AS (SELECT $1::text as term) SELECT json_build_object('stock', (SELECT COALESCE(json_agg(p), '[]'::json) FROM (SELECT * FROM products WHERE (name ILIKE '%' || (SELECT term FROM search) || '%' OR model ILIKE '%' || (SELECT term FROM search) || '%') AND status = 'active' LIMIT 12) p), 'intel', (SELECT COALESCE(json_agg(c), '[]'::json) FROM (SELECT * FROM market_intelligence WHERE (raw_content ILIKE '%' || (SELECT term FROM search) || '%') AND status = 'published' LIMIT 5) c), 'nab_data', (SELECT COALESCE(json_agg(n), '[]'::json) FROM (SELECT * FROM nab_market WHERE (title ILIKE '%' || (SELECT term FROM search) || '%' OR content ILIKE '%' || (SELECT term FROM search) || '%') LIMIT 5) n));"
      }
      if (!restored.result_component_config || restored.result_component_config === '{}') {
        restored.result_component_config =
          '{ "displayMode": "grid", "columns": { "mobile": 1, "desktop": 3 }, "showPrice": true }'
      }
      setLocalGlobal(restored)
    }
  }, [globalSettings])

  useEffect(() => {
    if (systemPromptTemplate !== undefined && !localPrompt) {
      setLocalPrompt(
        systemPromptTemplate ||
          'Você é o Especialista My Way Business, autoridade em audiovisual profissional. Sua missão é converter consultas em vendas. REGRAS: 1. SOBERANIA DE DADOS: Se houver produtos no stock, eles ESTÃO DISPONÍVEIS. 2. FORMATO: Use Markdown e negrito para nomes/preços. 3. MIAMI: Mencione envio de Miami e garantia Brasil/LATAM.',
      )
    }
  }, [systemPromptTemplate])

  useEffect(() => {
    if (logisticsRulesPrompt !== undefined && !localLogistics) {
      setLocalLogistics(
        logisticsRulesPrompt ||
          'Se price_usd > 0: Envio de Miami com garantia integral no Brasil e América Latina. Origem: Doral, FL.',
      )
    }
  }, [logisticsRulesPrompt])

  const handleSaveGlobal = async () => {
    if (!localGlobal) return
    setSavingGlobal(true)
    await saveGlobalSettings(localGlobal)
    setSavingGlobal(false)
  }

  const handleSavePrompt = async () => {
    setSavingPrompt(true)
    await saveSystemPrompt(localPrompt)
    setSavingPrompt(false)
  }

  const handleSaveLogistics = async () => {
    setSavingLogistics(true)
    await saveLogisticsRules(localLogistics)
    setSavingLogistics(false)
  }

  if (loading || !localGlobal) {
    return <div className="p-8 text-center text-muted-foreground">Carregando configurações...</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Configurações da IA</h1>

      <Tabs defaultValue="global" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="global">Configurações Globais</TabsTrigger>
          <TabsTrigger value="prompt">Instruções da IA</TabsTrigger>
          <TabsTrigger value="logistics">Contexto Institucional</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Limites e Cache</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Expiração do Cache (Dias)</Label>
                <Input
                  type="number"
                  value={localGlobal.cache_expiration_days}
                  onChange={(e) =>
                    setLocalGlobal({
                      ...localGlobal,
                      cache_expiration_days: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Limite de Preço para Especialista (USD)</Label>
                <Input
                  type="number"
                  value={localGlobal.price_threshold_usd}
                  onChange={(e) =>
                    setLocalGlobal({
                      ...localGlobal,
                      price_threshold_usd: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gatilhos do WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label>Baixa Confiança (Low Confidence)</Label>
                <Switch
                  checked={localGlobal.whatsapp_trigger_low_confidence}
                  onCheckedChange={(checked) =>
                    setLocalGlobal({ ...localGlobal, whatsapp_trigger_low_confidence: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label>Palavras-chave de Compra</Label>
                <Switch
                  checked={localGlobal.whatsapp_trigger_purchase_keywords}
                  onCheckedChange={(checked) =>
                    setLocalGlobal({ ...localGlobal, whatsapp_trigger_purchase_keywords: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label>Palavras-chave de Projeto</Label>
                <Switch
                  checked={localGlobal.whatsapp_trigger_project_keywords}
                  onCheckedChange={(checked) =>
                    setLocalGlobal({ ...localGlobal, whatsapp_trigger_project_keywords: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label>Produto Caro (Acima do limite)</Label>
                <Switch
                  checked={localGlobal.whatsapp_trigger_expensive_product}
                  onCheckedChange={(checked) =>
                    setLocalGlobal({ ...localGlobal, whatsapp_trigger_expensive_product: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lógica de Busca (SQL)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                className="font-mono text-sm min-h-[150px]"
                value={localGlobal.search_algorithm_sql}
                onChange={(e) =>
                  setLocalGlobal({ ...localGlobal, search_algorithm_sql: e.target.value })
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuração Visual (JSON)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                className="font-mono text-sm min-h-[100px]"
                value={localGlobal.result_component_config}
                onChange={(e) =>
                  setLocalGlobal({ ...localGlobal, result_component_config: e.target.value })
                }
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveGlobal} disabled={savingGlobal}>
              {savingGlobal ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar Configurações Globais'
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="prompt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Instruções da IA (System Prompt)</CardTitle>
              <CardDescription>
                Defina o comportamento e o tom de voz do agente de IA.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                className="text-sm min-h-[300px]"
                value={localPrompt}
                onChange={(e) => setLocalPrompt(e.target.value)}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSavePrompt} disabled={savingPrompt}>
              {savingPrompt ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar Instruções da IA'
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="logistics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contexto Institucional e Regras Logísticas</CardTitle>
              <CardDescription>
                Defina as regras de envio, garantia e origem dos produtos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                className="text-sm min-h-[200px]"
                value={localLogistics}
                onChange={(e) => setLocalLogistics(e.target.value)}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveLogistics} disabled={savingLogistics}>
              {savingLogistics ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar Contexto Institucional'
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
