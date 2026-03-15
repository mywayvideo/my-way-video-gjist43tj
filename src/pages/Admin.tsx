import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Product, CompanyInfo } from '@/types'
import { supabase } from '@/lib/supabase/client'
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
import {
  Plus,
  Edit,
  Trash2,
  Box,
  Package,
  ArrowLeft,
  Database,
  Search,
  Upload,
  Star,
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { AdminProductForm } from '@/components/AdminProductForm'

export default function Admin() {
  const { user, loading: authLoading } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [search, setSearch] = useState('')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [savingInfo, setSavingInfo] = useState(false)

  const fetchData = async () => {
    const { data: pData } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (pData) setProducts(pData)

    const { data: cData } = await supabase.from('company_info').select('*').limit(1).single()
    if (cData) setCompanyInfo(cData)
  }

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  if (authLoading) return <div className="p-8 text-center">Loading...</div>
  if (!user) return <Navigate to="/login" replace />

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())),
  )

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir produto?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else {
      toast({ title: 'Sucesso', description: 'Produto removido.' })
      fetchData()
    }
  }

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string
        const lines = text
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
        if (lines.length < 2) throw new Error('CSV vazio ou inválido')

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
        const validProducts = lines
          .slice(1)
          .map((line) => {
            const values = line.split(',')
            const prod: any = {}
            headers.forEach((h, i) => {
              let val = values[i]?.trim() || null
              if (h === 'price_brl' || h === 'stock' || h === 'weight') {
                prod[h] = val ? parseFloat(val) : 0
              } else if (h === 'is_special') {
                prod[h] =
                  val === 'true' ||
                  val === '1' ||
                  val?.toLowerCase() === 'yes' ||
                  val?.toLowerCase() === 'sim' ||
                  val?.toLowerCase() === 's'
              } else {
                prod[h] = val
              }
            })
            return prod
          })
          .filter((p) => p.name)

        const { data, error } = await supabase
          .from('products')
          .upsert(validProducts, { onConflict: 'sku', ignoreDuplicates: false })
          .select()

        if (error) throw error
        toast({
          title: 'Sucesso',
          description: `Sucesso: ${data?.length || 0} produtos criados/atualizados.`,
        })
        fetchData()
      } catch (err: any) {
        toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' })
      } finally {
        setIsUploading(false)
      }
    }
    reader.readAsText(file)
  }

  const handleSaveCompanyInfo = async () => {
    if (!companyInfo) return
    setSavingInfo(true)
    const { error } = await supabase
      .from('company_info')
      .update({ content: companyInfo.content, updated_at: new Date().toISOString() })
      .eq('id', companyInfo.id)
    setSavingInfo(false)
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else toast({ title: 'Salvo', description: 'Base de Conhecimento atualizada.' })
  }

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col gap-8 max-w-7xl animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Admin Dashboard{' '}
              <Badge className="bg-accent/20 text-accent hover:bg-accent/30 border-none">PRO</Badge>
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Database className="w-3 h-3" /> Supabase Real-time DB
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative overflow-hidden inline-block">
            <Button variant="secondary" disabled={isUploading}>
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? 'Processando...' : 'Importar CSV'}
            </Button>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>

          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) setEditingProduct(null)
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg">
                <Plus className="w-5 h-5 mr-2" /> Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-white/10 shadow-elevation">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {editingProduct ? 'Editar Equipamento' : 'Adicionar ao Inventário'}
                </DialogTitle>
                <DialogDescription>
                  Salva diretamente no Supabase e atualiza o Agente de IA.
                </DialogDescription>
              </DialogHeader>
              <AdminProductForm
                initialData={editingProduct}
                onSuccess={() => {
                  setIsDialogOpen(false)
                  fetchData()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-white/5 rounded-xl p-6 flex flex-col shadow-subtle">
          <h2 className="font-semibold text-lg mb-4 text-accent">Base de Conhecimento (IA)</h2>
          <Label className="mb-2 text-muted-foreground">Contexto Institucional para o Agente</Label>
          <Textarea
            className="min-h-[150px] bg-background/50 border-white/10 font-mono text-xs"
            value={companyInfo?.content || ''}
            onChange={(e) =>
              setCompanyInfo((prev) => (prev ? { ...prev, content: e.target.value } : null))
            }
          />
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleSaveCompanyInfo}
              disabled={savingInfo}
              variant="outline"
              className="border-accent text-accent hover:bg-accent/10"
            >
              {savingInfo ? 'Salvando...' : 'Salvar Contexto IA'}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-card border border-white/5 rounded-xl p-6 flex items-center gap-5 shadow-subtle">
            <div className="p-4 bg-accent/10 text-accent rounded-xl border border-accent/20">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Produtos</p>
              <p className="text-3xl font-bold font-mono">{products.length}</p>
            </div>
          </div>
          <div className="bg-card border border-white/5 rounded-xl p-6 flex items-center gap-5 shadow-subtle">
            <div className="p-4 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Itens em Estoque</p>
              <p className="text-3xl font-bold font-mono">
                {products.filter((p) => p.stock > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-white/5 rounded-xl overflow-hidden shadow-subtle flex flex-col">
        <div className="p-4 border-b border-white/5 bg-muted/20 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <h2 className="font-semibold text-lg">Catálogo Supabase</h2>
          <div className="relative w-full sm:w-auto">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou SKU..."
              className="pl-9 w-full sm:w-[300px] bg-background border-white/10 focus-visible:ring-accent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-white/10">
                <TableHead className="w-[300px]">Equipamento</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Preço BRL</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} className="border-white/5 hover:bg-white/5">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <p className="line-clamp-1 text-foreground" title={product.name}>
                        {product.name}
                      </p>
                      {product.is_special && (
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{product.category}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                  <TableCell className="font-mono font-medium text-foreground">
                    R$ {product.price_brl.toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {product.stock > 0 ? (
                      <span className="text-green-500 font-medium">{product.stock} un.</span>
                    ) : (
                      <span className="text-destructive font-medium">Esgotado</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(product)}
                        className="text-muted-foreground hover:text-accent"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
