import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Product, Manufacturer } from '@/types'
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
import { Plus, Edit, Trash2, Box, Package, ArrowLeft, Search, ImageIcon } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AdminProductForm } from '@/components/AdminProductForm'
import { AdminCSVUploader } from '@/components/AdminCSVUploader'

export default function Admin() {
  const { user, loading: authLoading } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [companyInfo, setCompanyInfo] = useState<any>(null)
  const [footerInfo, setFooterInfo] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [savingInfo, setSavingInfo] = useState(false)

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

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir produto?')) return
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
    toast({ title: 'Salvo', description: 'Configurações atualizadas.' })
    fetchData()
  }

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col gap-8 max-w-7xl animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Gestão de Catálogo <Badge className="bg-accent/20 text-accent">PRO</Badge>
            </h1>
          </div>
        </div>
        <div className="flex gap-4">
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
              <Button className="bg-accent text-accent-foreground">
                <Plus className="w-4 h-4 mr-2" /> Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-white/10">
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
        <div className="bg-card border border-white/5 rounded-xl p-6 flex flex-col shadow-sm space-y-4">
          <h2 className="font-semibold text-lg text-accent">Treinamento da IA & Footer</h2>
          <Label className="text-muted-foreground">Contexto Institucional (IA)</Label>
          <Textarea
            className="min-h-[80px] bg-background/50 font-mono text-xs"
            value={companyInfo?.content || ''}
            onChange={(e) => setCompanyInfo((p: any) => ({ ...p, content: e.target.value }))}
          />
          <Label className="text-muted-foreground mt-2">Sobre a Empresa (Footer)</Label>
          <Textarea
            className="min-h-[60px] bg-background/50 text-xs"
            value={footerInfo?.content || ''}
            onChange={(e) => setFooterInfo((p: any) => ({ ...p, content: e.target.value }))}
          />
          <Button
            onClick={handleSaveCompanyInfo}
            disabled={savingInfo}
            variant="outline"
            className="self-end mt-2"
          >
            {savingInfo ? 'Salvando...' : 'Atualizar Dados'}
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-card border border-white/5 rounded-xl p-6 flex items-center gap-5">
            <div className="p-4 bg-accent/10 text-accent rounded-xl">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Produtos Cadastrados</p>
              <p className="text-3xl font-bold font-mono">{products.length}</p>
            </div>
          </div>
          <div className="bg-card border border-white/5 rounded-xl p-6 flex items-center gap-5">
            <div className="p-4 bg-blue-500/10 text-blue-500 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fabricantes / Marcas</p>
              <p className="text-3xl font-bold font-mono">{manufacturers.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-white/5 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-white/5 bg-muted/20 flex justify-between items-center">
          <h2 className="font-semibold">Inventário ({filteredProducts.length})</h2>
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Img</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Fabricante</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Preço (USD / BRL)</TableHead>
              <TableHead className="text-amber-500">Custo (BRL)</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt="thumb"
                      className="w-10 h-10 object-cover rounded bg-white/5"
                    />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-xs">{p.manufacturer?.name || '-'}</TableCell>
                <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                <TableCell className="font-mono text-sm">
                  ${p.price_usd} / R${p.price_brl}
                </TableCell>
                <TableCell className="font-mono text-sm text-amber-500">R${p.price_cost}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingProduct(p)
                      setIsDialogOpen(true)
                    }}
                  >
                    <Edit className="w-4 h-4 text-muted-foreground hover:text-white" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
