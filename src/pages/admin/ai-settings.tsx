import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Save, BookOpen } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AdminAISettings() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // ai_settings
  const [aiSettingsId, setAiSettingsId] = useState<string | null>(null)
  const [cacheExpirationDays, setCacheExpirationDays] = useState(30)
  const [priceThresholdUsd, setPriceThresholdUsd] = useState(5000)
  const [searchAlgorithmSql, setSearchAlgorithmSql] = useState('')
  const [systemPromptTemplate, setSystemPromptTemplate] = useState('')
  const [resultComponentConfig, setResultComponentConfig] = useState(
    '{\n  "columns_desktop": 4,\n  "columns_mobile": 2\n}',
  )
  const [ignoreStockCount, setIgnoreStockCount] = useState(true)
  const [logisticsRulesPrompt, setLogisticsRulesPrompt] = useState('')

  // ai_agent_settings
  const [aiAgentSettingsId, setAiAgentSettingsId] = useState<string | null>(null)
  const [whatsappTriggerLowConfidence, setWhatsappTriggerLowConfidence] = useState(true)
  const [whatsappTriggerPurchaseKeywords, setWhatsappTriggerPurchaseKeywords] = useState(true)
  const [whatsappTriggerProjectKeywords, setWhatsappTriggerProjectKeywords] = useState(true)
  const [whatsappTriggerExpensiveProduct, setWhatsappTriggerExpensiveProduct] = useState(true)
  const [whatsappTriggerKeywords, setWhatsappTriggerKeywords] = useState('')
  const [confidenceThresholdForWhatsapp, setConfidenceThresholdForWhatsapp] = useState('low')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [maxWebSearchAttempts, setMaxWebSearchAttempts] = useState(2)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const [aiSetRes, agentSetRes] = await Promise.all([
        supabase.from('ai_settings').select('*').limit(1).maybeSingle(),
        supabase.from('ai_agent_settings').select('*').limit(1).maybeSingle(),
      ])

      if (aiSetRes.data) {
        setAiSettingsId(aiSetRes.data.id)
        setCacheExpirationDays(aiSetRes.data.cache_expiration_days ?? 30)
        setPriceThresholdUsd(aiSetRes.data.price_threshold_usd ?? 5000)
        setSearchAlgorithmSql(aiSetRes.data.search_algorithm_sql ?? '')
        setSystemPromptTemplate(aiSetRes.data.system_prompt_template ?? '')
        setResultComponentConfig(
          JSON.stringify(
            aiSetRes.data.result_component_config ?? { columns_desktop: 4, columns_mobile: 2 },
            null,
            2,
          ),
        )
        setIgnoreStockCount(aiSetRes.data.ignore_stock_count ?? true)
        setLogisticsRulesPrompt(aiSetRes.data.logistics_rules_prompt ?? '')
      }

      if (agentSetRes.data) {
        setAiAgentSettingsId(agentSetRes.data.id)
        setWhatsappTriggerLowConfidence(agentSetRes.data.whatsapp_trigger_low_confidence ?? true)
        setWhatsappTriggerPurchaseKeywords(
          agentSetRes.data.whatsapp_trigger_purchase_keywords ?? true,
        )
        setWhatsappTriggerProjectKeywords(
          agentSetRes.data.whatsapp_trigger_project_keywords ?? true,
        )
        setWhatsappTriggerExpensiveProduct(
          agentSetRes.data.whatsapp_trigger_expensive_product ?? true,
        )
        setWhatsappTriggerKeywords((agentSetRes.data.whatsapp_trigger_keywords ?? []).join(', '))
        setConfidenceThresholdForWhatsapp(
          agentSetRes.data.confidence_threshold_for_whatsapp ?? 'low',
        )
        setSystemPrompt(agentSetRes.data.system_prompt ?? '')
        setMaxWebSearchAttempts(agentSetRes.data.max_web_search_attempts ?? 2)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!systemPromptTemplate.trim() && !systemPrompt.trim()) {
      if (
        !window.confirm(
          'Campos de estratégia estão vazios. O Fallback de Especialista será ativado. Deseja continuar?',
        )
      ) {
        return
      }
    }

    let parsedConfig = {}
    try {
      parsedConfig = JSON.parse(resultComponentConfig)
    } catch (e) {
      toast({
        title: 'JSON Inválido',
        description: 'A configuração de exibição (Seção F) contém um JSON inválido.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const aiSettingsData: any = {
        cache_expiration_days: cacheExpirationDays,
        price_threshold_usd: priceThresholdUsd,
        search_algorithm_sql: searchAlgorithmSql,
        system_prompt_template: systemPromptTemplate,
        result_component_config: parsedConfig,
        ignore_stock_count: ignoreStockCount,
        logistics_rules_prompt: logisticsRulesPrompt,
      }

      if (aiSettingsId) aiSettingsData.id = aiSettingsId

      const { data: savedAiSettings, error: aiError } = await supabase
        .from('ai_settings')
        .upsert(aiSettingsData)
        .select()
        .single()

      if (aiError) throw aiError
      if (savedAiSettings) setAiSettingsId(savedAiSettings.id)

      const keywordsArray = whatsappTriggerKeywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k)

      const aiAgentSettingsData: any = {
        whatsapp_trigger_low_confidence: whatsappTriggerLowConfidence,
        whatsapp_trigger_purchase_keywords: whatsappTriggerPurchaseKeywords,
        whatsapp_trigger_project_keywords: whatsappTriggerProjectKeywords,
        whatsapp_trigger_expensive_product: whatsappTriggerExpensiveProduct,
        whatsapp_trigger_keywords: keywordsArray,
        confidence_threshold_for_whatsapp: confidenceThresholdForWhatsapp,
        system_prompt: systemPrompt,
        max_web_search_attempts: maxWebSearchAttempts,
      }

      if (aiAgentSettingsId) aiAgentSettingsData.id = aiAgentSettingsId

      const { data: savedAgentSettings, error: agentError } = await supabase
        .from('ai_agent_settings')
        .upsert(aiAgentSettingsData)
        .select()
        .single()

      if (agentError) throw agentError
      if (savedAgentSettings) setAiAgentSettingsId(savedAgentSettings.id)

      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso.',
      })
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações Globais da IA</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie o comportamento, restrições e regras do agente de inteligência artificial.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">Configurações (A - G)</TabsTrigger>
          <TabsTrigger value="documentation">Documentação e Uso</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">
                    A
                  </span>
                  Configuração de Cache
                </CardTitle>
                <CardDescription>
                  Tempo de expiração para pesquisas repetidas e tentativas externas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Expiração de Cache (Dias)</Label>
                  <Input
                    type="number"
                    value={cacheExpirationDays}
                    onChange={(e) => setCacheExpirationDays(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2 mt-4">
                  <Label>Tentativas de Busca na Web (AI Agent)</Label>
                  <Input
                    type="number"
                    value={maxWebSearchAttempts}
                    onChange={(e) => setMaxWebSearchAttempts(Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">
                    B
                  </span>
                  Limite de Preço
                </CardTitle>
                <CardDescription>
                  Valor a partir do qual o especialista humano será acionado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Threshold (USD)</Label>
                  <Input
                    type="number"
                    value={priceThresholdUsd}
                    onChange={(e) => setPriceThresholdUsd(Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">
                  C
                </span>
                Gatilhos do WhatsApp
              </CardTitle>
              <CardDescription>
                Condições em que o botão de contato humano será oferecido pelo assistente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Baixa Confiança</Label>
                    <p className="text-sm text-muted-foreground">
                      Acionar se a IA não souber a resposta.
                    </p>
                  </div>
                  <Switch
                    checked={whatsappTriggerLowConfidence}
                    onCheckedChange={setWhatsappTriggerLowConfidence}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Intenção de Compra</Label>
                    <p className="text-sm text-muted-foreground">
                      Acionar em menções diretas de compra.
                    </p>
                  </div>
                  <Switch
                    checked={whatsappTriggerPurchaseKeywords}
                    onCheckedChange={setWhatsappTriggerPurchaseKeywords}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Projetos Complexos</Label>
                    <p className="text-sm text-muted-foreground">
                      Acionar para estúdios e integrações.
                    </p>
                  </div>
                  <Switch
                    checked={whatsappTriggerProjectKeywords}
                    onCheckedChange={setWhatsappTriggerProjectKeywords}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Produtos Caros</Label>
                    <p className="text-sm text-muted-foreground">
                      Acionar se o item passar do Limite (Seção B).
                    </p>
                  </div>
                  <Switch
                    checked={whatsappTriggerExpensiveProduct}
                    onCheckedChange={setWhatsappTriggerExpensiveProduct}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Palavras-chave Específicas (separadas por vírgula)</Label>
                <Input
                  value={whatsappTriggerKeywords}
                  onChange={(e) => setWhatsappTriggerKeywords(e.target.value)}
                  placeholder="comprar, orçamento, quanto custa, desconto"
                />
              </div>

              <div className="space-y-2">
                <Label>Limiar de Confiança Base</Label>
                <Select
                  value={confidenceThresholdForWhatsapp}
                  onValueChange={setConfidenceThresholdForWhatsapp}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixo (Low)</SelectItem>
                    <SelectItem value="medium">Médio (Medium)</SelectItem>
                    <SelectItem value="high">Alto (High)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">
                  D
                </span>
                Algoritmo de Busca (SQL)
              </CardTitle>
              <CardDescription>
                Define a prioridade e os métodos de ordenação dos produtos na busca unificada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={searchAlgorithmSql}
                onChange={(e) => setSearchAlgorithmSql(e.target.value)}
                className="font-mono h-32"
                placeholder="Ex: SELECT * FROM products WHERE name ILIKE $1 ORDER BY price_usa DESC"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">
                  E
                </span>
                AI Expert Prompt (Instruções de Sistema)
              </CardTitle>
              <CardDescription>
                O prompt principal que define a persona e os limites da IA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Template de Prompt Secundário (ai_settings)</Label>
                <Textarea
                  value={systemPromptTemplate}
                  onChange={(e) => setSystemPromptTemplate(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Prompt Principal do Agente (ai_agent_settings)</Label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">
                  F
                </span>
                Configuração de Exibição
              </CardTitle>
              <CardDescription>
                Opções em JSON (ex: número de colunas para o grid de renderização).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={resultComponentConfig}
                onChange={(e) => setResultComponentConfig(e.target.value)}
                className="font-mono h-32"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">
                  G
                </span>
                Logística e Estoque
              </CardTitle>
              <CardDescription>
                Restrições de exibição baseadas no estoque e regras de frete.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>Ignorar Estoque Zerado</Label>
                  <p className="text-sm text-muted-foreground">
                    Se ativo, a IA ignora a quantidade em estoque ao recomendar.
                  </p>
                </div>
                <Switch checked={ignoreStockCount} onCheckedChange={setIgnoreStockCount} />
              </div>

              <div className="space-y-2">
                <Label>Prompt de Regras Logísticas</Label>
                <Textarea
                  value={logisticsRulesPrompt}
                  onChange={(e) => setLogisticsRulesPrompt(e.target.value)}
                  className="h-24"
                  placeholder="Ex: Todos os produtos são enviados de Miami..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Documentação de Uso dos Campos
              </CardTitle>
              <CardDescription>
                Compreenda como cada seção configurada na aba principal está sendo efetivamente
                consumida pelos serviços (Edge Functions e UI) do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="sec-a">
                  <AccordionTrigger>Seção A - Configuração de Cache</AccordionTrigger>
                  <AccordionContent className="space-y-2 text-muted-foreground pb-4">
                    <p>
                      <strong>Expiração de Cache (Dias):</strong> Salvo na tabela{' '}
                      <code>ai_settings</code>. <em>Status:</em>{' '}
                      <span className="text-amber-600 font-semibold">Parcialmente Utilizado</span>.
                      Atualmente, a Edge Function <code>ai-search</code> possui o valor de expiração
                      fixado (hardcoded) no seu código fonte. Este campo no banco não altera o
                      comportamento atual sem uma atualização específica na Edge Function.
                    </p>
                    <p>
                      <strong>Tentativas de Busca na Web:</strong> Salvo em{' '}
                      <code>ai_agent_settings</code>. <em>Status:</em>{' '}
                      <span className="text-green-600 font-semibold">Em Uso</span>. Utilizado na
                      função <code>ai-search</code> para definir quantas vezes a IA tem permissão
                      para realizar buscas externas caso não encontre a resposta de imediato no
                      catálogo.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sec-b">
                  <AccordionTrigger>Seção B - Limite de Preço</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    <p>
                      <strong>Threshold (USD):</strong> Salvo em{' '}
                      <code>ai_settings.price_threshold_usd</code>. <em>Status:</em>{' '}
                      <span className="text-green-600 font-semibold">Em Uso</span>. Tanto a função{' '}
                      <code>ai-search</code> quanto a <code>call-ai-agent</code> leem este valor a
                      cada interação. Se o preço do produto exceder este limite e for recomendado ao
                      cliente, a IA aciona automaticamente o especialista humano via WhatsApp para
                      negociação de alto nível.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sec-c">
                  <AccordionTrigger>Seção C - Gatilhos do WhatsApp</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-2 pb-4">
                    <p>
                      <em>Status Geral:</em>{' '}
                      <span className="text-green-600 font-semibold">Em Uso Rigoroso</span>
                    </p>
                    <p>
                      Esses <em>switches</em> controlam variáveis na tabela{' '}
                      <code>ai_agent_settings</code>. Na função <code>call-ai-agent</code> (método
                      interno <code>evaluateWhatsAppTriggers</code>) e na <code>ai-search</code>,
                      eles definem proativamente se o botão de contato humano aparece na UI.
                    </p>
                    <p>
                      São validados em tempo real no final de cada requisição analisando a intenção
                      do texto (ex: se detectar as palavras-chave cadastradas como "comprar",
                      "orçamento").
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sec-d">
                  <AccordionTrigger>Seção D - Algoritmo de Busca (SQL)</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    <p>
                      <strong>Query SQL:</strong> Salvo em{' '}
                      <code>ai_settings.search_algorithm_sql</code>. <em>Status:</em>{' '}
                      <span className="text-blue-600 font-semibold">Uso no Frontend/Hooks</span>. As
                      Edge Functions de IA (como <code>ai-search</code> e <code>call-ai-agent</code>
                      ) utilizam métodos da API REST do Supabase (ex: <code>.or()</code>) e não
                      executam este texto SQL cru diretamente. Contudo, este campo foi desenhado
                      para a "Soberania da Busca" na UI, sendo resgatado e empregado pela camada de
                      hooks (ex: <code>use-ai-search.ts</code>) em buscas unificadas e diretas de
                      catálogo sem IA.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sec-e">
                  <AccordionTrigger>Seção E - AI Expert Prompt</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-2 pb-4">
                    <p>
                      <strong>Template Secundário (ai_settings):</strong> <em>Status:</em>{' '}
                      <span className="text-green-600 font-semibold">Em Uso</span>. Carregado na{' '}
                      <code>ai-search</code> como parte da montagem da base de instruções
                      operacionais.
                    </p>
                    <p>
                      <strong>Prompt Principal (ai_agent_settings):</strong> <em>Status:</em>{' '}
                      <span className="text-green-600 font-semibold">Em Uso Prioritário</span>. É a
                      instrução mais importante lida pela função <code>call-ai-agent</code>, que
                      atua como o "Fallback de Especialista". Injetado com prioridade máxima no
                      envio para os provedores como OpenAI e DeepSeek.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sec-f">
                  <AccordionTrigger>Seção F - Configuração de Exibição</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    <p>
                      <strong>JSON Visuais:</strong> Salvo em{' '}
                      <code>ai_settings.result_component_config</code>. <em>Status:</em>{' '}
                      <span className="text-blue-600 font-semibold">Em Uso pela UI</span>. Injetado
                      dinamicamente no frontend (em componentes como o{' '}
                      <code>ResponseFormatter.tsx</code>) para ditar a consistência e a diagramação
                      do Grid de produtos recomendados (ex: delimitando o número exato de colunas em
                      monitores vs. dispositivos móveis).
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sec-g">
                  <AccordionTrigger>Seção G - Logística e Estoque</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-2 pb-4">
                    <p>
                      <strong>Ignorar Estoque:</strong> <em>Status:</em>{' '}
                      <span className="text-green-600 font-semibold">Em Uso</span>. Se marcado
                      (true), os produtos da base de dados são disponibilizados para recomendação
                      pela IA mesmo que a coluna <code>stock</code> seja menor ou igual a zero
                      (leitura verificada dinamicamente na <code>ai-search</code> e na{' '}
                      <code>call-ai-agent</code>).
                    </p>
                    <p>
                      <strong>Prompt de Logística:</strong> <em>Status:</em>{' '}
                      <span className="text-green-600 font-semibold">Em Uso</span>. Texto
                      concatenado junto ao Prompt de Sistema. Informa obrigatoriamente a IA sobre
                      restrições do negócio, como o local de origem do envio (Miami) e a garantia
                      aplicada nos produtos para a América Latina.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
