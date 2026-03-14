import { useState } from 'react'
import { useProductStore } from '@/stores/useProductStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { Product } from '@/lib/mockData'
import { formatUSD } from '@/lib/utils'
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
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Box, Package, ArrowLeft, Database, Search } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
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
  const { user } = useAuthStore()
  const { products, deleteProduct } = useProductStore()
  const [search, setSearch] = useState('')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()),
  )

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setIsDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingProduct(null)
    setIsDialogOpen(true)
  }

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col gap-6 max-w-7xl animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
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
              <Database className="w-3 h-3" /> Conectado ao Skip Cloud (Real-time DB)
            </p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={handleCreate}
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" /> Novo Equipamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-white/10 shadow-elevation">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingProduct ? 'Editar Equipamento' : 'Adicionar ao Inventário'}
              </DialogTitle>
              <DialogDescription>
                As alterações feitas aqui refletirão instantaneamente no site e no Agente de IA.
              </DialogDescription>
            </DialogHeader>
            <AdminProductForm
              initialData={editingProduct}
              onSuccess={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
        <div className="bg-card border border-white/5 rounded-xl p-6 flex items-center gap-5 shadow-subtle relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="p-4 bg-accent/10 text-accent rounded-xl border border-accent/20">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total de Produtos</p>
            <p className="text-3xl font-bold font-mono">{products.length}</p>
          </div>
        </div>
        <div className="bg-card border border-white/5 rounded-xl p-6 flex items-center gap-5 shadow-subtle relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="p-4 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Em Estoque</p>
            <p className="text-3xl font-bold font-mono">
              {products.filter((p) => p.inStock).length}
            </p>
          </div>
        </div>
        <div className="bg-card border border-white/5 rounded-xl p-6 flex flex-col justify-center shadow-subtle">
          <p className="text-sm font-medium text-muted-foreground mb-3">Status do Sincronismo</p>
          <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 w-fit px-3 py-1.5 rounded-full border border-green-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live (Skip Cloud DB)
          </div>
        </div>
      </div>

      <div className="bg-card border border-white/5 rounded-xl overflow-hidden shadow-subtle flex flex-col">
        <div className="p-4 border-b border-white/5 bg-muted/20 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <h2 className="font-semibold text-lg">Catálogo Real-Time</h2>
          <div className="relative w-full sm:w-auto">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, marca..."
              className="pl-9 w-full sm:w-[300px] bg-background border-white/10 focus-visible:ring-accent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="w-[300px]">Equipamento</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço Miami</TableHead>
                <TableHead>Preço Brasil</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow
                  key={product.id}
                  className="border-white/5 hover:bg-white/5 transition-colors"
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-background border border-white/10 p-1 flex-shrink-0">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                      <div>
                        <p className="line-clamp-1 text-foreground" title={product.name}>
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {product.brand}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-white/10 bg-white/5">
                      {product.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {formatUSD(product.priceMiami)}
                  </TableCell>
                  <TableCell className="font-mono font-medium text-foreground">
                    {formatUSD(product.priceBrazil)}
                  </TableCell>
                  <TableCell>
                    {product.inStock ? (
                      <div className="flex items-center gap-1.5 text-green-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        <span className="font-medium">{product.stockQuantity} un.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-destructive">
                        <div className="w-1.5 h-1.5 rounded-full bg-destructive"></div>
                        <span className="font-medium">Esgotado</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(product)}
                        className="text-muted-foreground hover:text-accent hover:bg-accent/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteProduct(product.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-6 h-6 opacity-50" />
                      <p>Nenhum equipamento encontrado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
