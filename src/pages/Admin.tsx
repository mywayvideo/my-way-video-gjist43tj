import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Product, Manufacturer } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { fetchUSDRate } from '@/services/awesome-api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Plus,
  Edit,
  Trash2,
  Box,
  ArrowLeft,
  Search,
  ImageIcon,
  Eye,
  DollarSign,
  Calculator,
  Bot,
  HardDrive,
  Settings,
  Sparkles,
  Download,
} from 'lucide-react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { AdminProductForm } from '@/components/AdminProductForm'
import { AdminCSVUploader } from '@/components/AdminCSVUploader'
import { cn } from '@/lib/utils'

const formatNCM = (ncm?: string | null) => {
  if (!ncm) return ''
  const digits = ncm.replace(/\D/g, '')
  if (digits.length >= 8) {
    return digits.replace(/^(\d{4})(\d{2})(\d{2}).*/, '$1.$2.$3')
  }
  return ncm
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  const [products, setProducts] = useState<Product[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [companyInfo, setCompanyInfo] = useState<any>(null)
  const [footerInfo, setFooterInfo] = useState<any>(null)

  // Pricing Settings
  const [pricing, setPricing] = useState<any>(null)
  const [usdRate, setUsdRate] = useState<number>(0)
  const [simUsd, setSimUsd] = useState<number>(1000)
  const [showPriceCost, setShowPriceCost] = useState(false)

  const [search, setSearch] = useState('')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [savingInfo, setSavingInfo] = useState(false)
  const [savingPricing, setSavingPricing] = useState(false)

  // Bulk Actions State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const fetchData = async () => {
    const { data: mData } = await supabase.from('manufacturers').select('*').order('name')
    if (mData) setManufacturers(mData)

    const { data: pData } = await supabase
      .from('products')
      .select('*, manufacturer:manufacturers(*)')
      .order('created_at', { ascending: false })
    if (pData) setProducts(pData)

    const { data: cData } = await supabase.from('company_info').select('*')
    if (cData) {
      setCompanyInfo(
        cData.find((c: any) => c.type === 'ai_knowledge') || { type: 'ai_knowledge', content: '' },
      )
      setFooterInfo(
        cData.find((c: any) => c.type === 'footer_about') || { type: 'footer_about', content: '' },
      )
    }

    const { data: prData } = await supabase
      .from('pricing_settings')
      .select('*')
      .limit(1)
      .maybeSingle()
    if (prData) setPricing(prData)
    else setPricing({ spread_type: 'percentage', spread_value: 0.1 })

    const { data: spData, error: spError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'show_price_cost')
      .maybeSingle()

    if (spError) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel carregar configuracoes.',
        variant: 'destructive',
      })
    } else if (spData) {
      setShowPriceCost(spData.value === 'true')
    }

    try {
      const rate = await fetchUSDRate()
      setUsdRate(rate)
    } catch (e) {
      console.error('Failed to fetch USD rate', e)
    }
  }

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  if (authLoading)
    return (
      <div className="p-8 text-center text-muted-foreground flex justify-center">
        <Box className="animate-spin w-6 h-6" />
      </div>
    )
  if (!user) return <Navigate to="/login" replace />

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())),
  )

  const isAllVisibleSelected =
    filteredProducts.length > 0 && filteredProducts.every((p) => selectedProductIds.includes(p.id))

  const toggleSelectAll = () => {
    const currentFilteredIds = filteredProducts.map((p) => p.id)
    if (isAllVisibleSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !currentFilteredIds.includes(id)))
    } else {
      const newIds = new Set([...selectedProductIds, ...currentFilteredIds])
      setSelectedProductIds(Array.from(newIds))
    }
  }

  const toggleProductSelection = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    )
  }

  const clearSelection = () => setSelectedProductIds([])

  const handleBulkDelete = async () => {
    setIsDeletingBulk(true)
    const { error } = await supabase.from('products').delete().in('id', selectedProductIds)
    setIsDeletingBulk(false)

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir produtos. Tente novamente.',
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Sucesso', description: 'Produtos excluidos com sucesso.' })
      clearSelection()
      setShowDeleteConfirm(false)
      fetchData()
    }
  }

  const handleExportCSV = () => {
    const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id))
    const headers = ['id', 'name', 'category', 'price_usd', 'ncm', 'sku']

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""'
      const str = String(val)
      return `"${str.replace(/"/g, '""')}"`
    }

    const csvRows = selectedProducts.map((p) => {
      return [
        escapeCsv(p.id),
        escapeCsv(p.name),
        escapeCsv(p.category),
        p.price_usd || 0,
        escapeCsv(formatNCM(p.ncm)),
        escapeCsv(p.sku),
      ].join(',')
    })

    const csvContent = [headers.join(','), ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

    link.setAttribute('href', url)
    link.setAttribute('download', `produtos-export-${timestamp}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({ title: 'Sucesso', description: 'Exportacao concluida. Arquivo baixado.' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir equipamento do catálogo?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else fetchData()
  }

  const handleSaveCompanyInfo = async () => {
    setSavingInfo(true)
    const saveObj = async (obj: any) => {
      if (obj.id)
        await supabase
          .from('company_info')
          .update({ content: obj.content, updated_at: new Date().toISOString() })
          .eq('id', obj.id)
      else if (obj.content)
        await supabase.from('company_info').insert([{ type: obj.type, content: obj.content }])
    }
    await saveObj(companyInfo)
    await saveObj(footerInfo)
    setSavingInfo(false)
    toast({ title: 'Salvo', description: 'Contexto institucional atualizado com sucesso.' })
    fetchData()
  }

  const handleSavePricing = async () => {
    setSavingPricing(true)
    try {
      if (pricing.id) {
        await supabase
          .from('pricing_settings')
          .update({
            spread_type: pricing.spread_type,
            spread_value: pricing.spread_value,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pricing.id)
      } else {
        const { data } = await supabase
          .from('pricing_settings')
          .insert([
            {
              spread_type: pricing.spread_type,
              spread_value: pricing.spread_value,
            },
          ])
          .select()
          .single()
        if (data) setPricing(data)
      }
      toast({ title: 'Salvo', description: 'Regras de precificação para o Brasil atualizadas.' })
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSavingPricing(false)
    }
  }

  const handleToggleShowPriceCost = async (checked: boolean) => {
    setShowPriceCost(checked)
    const { error } = await supabase.from('settings').upsert(
      {
        key: 'show_price_cost',
        value: checked ? 'true' : 'false',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    )
    if (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar configuração.',
        variant: 'destructive',
      })
      setShowPriceCost(!checked)
    } else {
      toast({ title: 'Sucesso', description: 'Configuracao atualizada com sucesso.' })
    }
  }

  const navBtnClasses = (path: string) => {
    const isActive = location.pathname === path
    return cn(
      'transition-all duration-200 border-primary/20 text-primary bg-transparent',
      isActive
        ? 'bg-primary/15 font-semibold border-l-4 border-l-primary'
        : 'hover:bg-primary/15 hover:text-primary hover:border-l-2 hover:border-l-primary hover:scale-105',
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col gap-8 max-w-7xl animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              Gestão de Catálogo{' '}
              <Badge className="bg-primary/20 text-primary uppercase tracking-wider text-xs">
                PRO
              </Badge>
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/product-cache">
            <Button variant="outline" className={navBtnClasses('/admin/product-cache')}>
              <HardDrive className="w-4 h-4 mr-2" /> Cache de IA
            </Button>
          </Link>
          <Link to="/admin/ai-providers">
            <Button variant="outline" className={navBtnClasses('/admin/ai-providers')}>
              <Bot className="w-4 h-4 mr-2" /> IA Providers
            </Button>
          </Link>
          <Link to="/admin/ai-settings">
            <Button variant="outline" className={navBtnClasses('/admin/ai-settings')}>
              <Settings className="w-4 h-4 mr-2" /> Configurações de IA
            </Button>
          </Link>
          <Link to="/admin/ai-system-prompt">
            <Button variant="outline" className={navBtnClasses('/admin/ai-system-prompt')}>
              <Sparkles className="w-4 h-4 mr-2" /> Instruções da IA
            </Button>
          </Link>
          <AdminCSVUploader
            manufacturers={manufacturers}
            onSuccess={fetchData}
            onAddManufacturer={fetchData}
          />
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) setEditingProduct(null)
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                <Plus className="w-4 h-4 mr-2" /> Novo Equipamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border/50">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Editar Equipamento' : 'Novo Equipamento'}
                </DialogTitle>
              </DialogHeader>
              <AdminProductForm
                initialData={editingProduct}
                manufacturers={manufacturers}
                onSuccess={() => {
                  setIsDialogOpen(false)
                  fetchData()
                }}
                onAddManufacturer={fetchData}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border/50 rounded-xl p-6 flex flex-col shadow-sm space-y-4">
          <h2 className="font-semibold text-lg text-primary flex items-center gap-2">
            Treinamento da IA & Institucional
          </h2>
          <div className="space-y-1">
            <Label className="text-muted-foreground">Contexto Base (Agente de IA)</Label>
            <Textarea
              className="min-h-[80px] bg-background/50 font-mono text-xs focus-visible:ring-primary/50"
              value={companyInfo?.content || ''}
              onChange={(e) => setCompanyInfo((p: any) => ({ ...p, content: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground mt-2">Sobre a Empresa (Rodapé)</Label>
            <Textarea
              className="min-h-[60px] bg-background/50 text-xs focus-visible:ring-primary/50"
              value={footerInfo?.content || ''}
              onChange={(e) => setFooterInfo((p: any) => ({ ...p, content: e.target.value }))}
            />
          </div>
          <Button
            onClick={handleSaveCompanyInfo}
            disabled={savingInfo}
            variant="secondary"
            className="self-end mt-2"
          >
            {savingInfo ? 'Salvando...' : 'Atualizar Base de Conhecimento'}
          </Button>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-6 flex flex-col shadow-sm space-y-4">
          <h2 className="font-semibold text-lg text-green-500 flex items-center gap-2">
            <DollarSign className="w-5 h-5" /> Configuração de Preço (Brasil)
          </h2>

          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="flex-1 space-y-2">
              <Label>Tipo de Spread</Label>
              <Select
                value={pricing?.spread_type || 'percentage'}
                onValueChange={(v) => setPricing((p: any) => ({ ...p, spread_type: v }))}
              >
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentual (%)</SelectItem>
                  <SelectItem value="fixed">Fixo (+ Valor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label>Valor do Spread</Label>
              <Input
                type="number"
                step="0.01"
                value={pricing?.spread_value || 0}
                onChange={(e) =>
                  setPricing((p: any) => ({ ...p, spread_value: parseFloat(e.target.value) || 0 }))
                }
                className="bg-background/50 border-border/50 font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-muted/40 rounded-lg text-xs font-mono border border-border/50 text-muted-foreground">
            <strong className="text-foreground">Fórmula Ativa:</strong> <br />
            {pricing?.spread_type === 'fixed'
              ? `Preço BRL = Preço USD * (Câmbio + ${pricing?.spread_value})`
              : `Preço BRL = Preço USD * Câmbio * (1 + ${pricing?.spread_value})`}
          </div>

          <div className="p-4 border border-border/50 rounded-lg space-y-3 bg-background/30">
            <h3 className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
              <Calculator className="w-4 h-4" /> Simulador BRL (Câmbio: R$ {usdRate.toFixed(3)})
            </h3>
            <div className="flex items-center gap-3">
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  US$
                </span>
                <Input
                  type="number"
                  value={simUsd}
                  onChange={(e) => setSimUsd(parseFloat(e.target.value) || 0)}
                  className="pl-10 h-10 border-border/50"
                />
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="font-mono font-bold text-xl text-green-500">
                R${' '}
                {pricing?.spread_type === 'fixed'
                  ? (simUsd * (usdRate + (pricing?.spread_value || 0))).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : (simUsd * usdRate * (1 + (pricing?.spread_value || 0))).toLocaleString(
                      'pt-BR',
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                    )}
              </div>
            </div>
          </div>

          <Button
            onClick={handleSavePricing}
            disabled={savingPricing}
            variant="secondary"
            className="self-end mt-2"
          >
            {savingPricing ? 'Salvando...' : 'Salvar Regras BRL'}
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl p-6 flex flex-col shadow-sm space-y-4">
        <div>
          <h2 className="font-semibold text-lg text-foreground flex items-center gap-2">
            Configuracoes de Preco
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerenciar exibicao de preco de custo para administradores
          </p>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-4">
          <div className="space-y-0.5">
            <Label className="text-base">
              Exibir Preco de Custo (FOB Miami) para Administradores
            </Label>
            <p className="text-xs text-muted-foreground">
              Quando ativado, o preco de custo aparecera na pagina do produto para usuarios admin.
            </p>
          </div>
          <Switch checked={showPriceCost} onCheckedChange={handleToggleShowPriceCost} />
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm relative">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <h2 className="font-semibold text-foreground">
            Inventário ({filteredProducts.length} itens)
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar equipamento..."
              className="pl-10 bg-background/50 border-border/50 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {selectedProductIds.length > 0 && (
          <div
            className={cn(
              'bg-background/95 backdrop-blur-sm border-b md:border-b md:border-t-0 border-t border-border/50 p-3 flex flex-col md:flex-row items-center justify-between gap-3 z-30 transition-all',
              'fixed bottom-0 left-0 right-0 md:static md:bottom-auto md:left-auto md:right-auto shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-none',
            )}
          >
            <span className="text-sm font-medium md:ml-2">
              {selectedProductIds.length} produtos selecionados
            </span>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={clearSelection}
                className="text-muted-foreground"
              >
                Limpar
              </Button>
              <Button
                size="sm"
                onClick={handleExportCSV}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" /> Exportar CSV
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </Button>
            </div>
          </div>
        )}

        <div
          className={cn('overflow-x-auto', selectedProductIds.length > 0 ? 'pb-24 md:pb-0' : '')}
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center px-4 align-middle">
                  <Checkbox
                    checked={isAllVisibleSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="w-16">Mídia</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">FOB Miami</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="px-4 text-center align-middle">
                    <Checkbox
                      checked={selectedProductIds.includes(p.id)}
                      onCheckedChange={() => toggleProductSelection(p.id)}
                      aria-label={`Select ${p.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt="thumb"
                        className="w-10 h-10 object-contain rounded bg-white/5 border border-white/10"
                      />
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10">
                        <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate" title={p.name}>
                    {p.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.manufacturer?.name || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="text-right font-mono font-medium text-primary">
                    US${' '}
                    {(p.price_usd || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Link to={`/product/${p.id}`} target="_blank" title="Visualizar Página">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingProduct(p)
                        setIsDialogOpen(true)
                      }}
                      className="hover:bg-accent/10 hover:text-accent transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p.id)}
                      className="hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Nenhum equipamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedProductIds.length} produtos? Esta acao nao
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBulk}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleBulkDelete()
              }}
              disabled={isDeletingBulk}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingBulk ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
