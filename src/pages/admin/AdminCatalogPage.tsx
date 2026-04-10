import { useState, useEffect } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
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
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Edit,
  Trash2,
  Box,
  Search,
  ImageIcon,
  ImageOff,
  Eye,
  Download,
  Loader2,
  X,
  ArrowUp,
  ArrowDown,
  Package,
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { ScrollToTopButton } from '@/components/ScrollToTopButton'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { cn } from '@/lib/utils'

const ALL_EXPORT_FIELDS = [
  'id',
  'name',
  'sku',
  'description',
  'price_brl',
  'stock',
  'image_url',
  'ncm',
  'weight',
  'dimensions',
  'category',
  'created_at',
  'is_special',
  'manufacturer_id',
  'price_usd',
  'price_cost',
  'technical_info',
  'is_discontinued',
]

const formatNCM = (ncm?: string | null) => {
  if (!ncm) return ''
  const digits = ncm.replace(/\D/g, '')
  if (digits.length >= 8) return digits.replace(/^(\d{4})(\d{2})(\d{2}).*/, '$1.$2.$3')
  return ncm
}

export default function AdminCatalogPage() {
  const { currentUser: user, loading: authLoading } = useAuthContext()
  const [products, setProducts] = useState<Product[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [search, setSearch] = useState('')
  const [filterNoImage, setFilterNoImage] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  const [sortColumn, setSortColumn] = useState<string>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedExportFields, setSelectedExportFields] = useState<string[]>(ALL_EXPORT_FIELDS)

  const fetchProductsData = async () => {
    let pQuery = supabase.from('products').select('*, manufacturer:manufacturers(*)')

    if (sortColumn !== 'brand') {
      pQuery = pQuery.order(sortColumn, { ascending: sortDirection === 'asc' })
    } else {
      pQuery = pQuery.order('created_at', { ascending: false })
    }

    const { data: pData } = await pQuery
    if (pData) {
      if (sortColumn === 'brand') {
        pData.sort((a, b) => {
          const nameA = a.manufacturer?.name || ''
          const nameB = b.manufacturer?.name || ''
          return sortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
        })
      }
      setProducts(pData)
    }
  }

  const fetchOtherData = async () => {
    const { data: mData } = await supabase.from('manufacturers').select('*').order('name')
    if (mData) setManufacturers(mData)
  }

  const fetchData = async () => {
    await fetchOtherData()
    await fetchProductsData()
  }

  useEffect(() => {
    if (user) fetchOtherData()
  }, [user])

  useEffect(() => {
    if (user) fetchProductsData()
  }, [user, sortColumn, sortDirection])

  useEffect(() => {
    const pos = sessionStorage.getItem('admin-products-scroll-position')
    if (pos && products.length > 0) {
      try {
        const { x, y } = JSON.parse(pos)
        setTimeout(() => {
          window.scrollTo({ left: x, top: y, behavior: 'smooth' })
          sessionStorage.removeItem('admin-products-scroll-position')
        }, 100)
      } catch (e) {
        console.error('Failed to parse scroll position', e)
      }
    }
  }, [products.length])

  if (authLoading)
    return (
      <div className="p-8 text-center text-muted-foreground flex justify-center">
        <Loader2 className="animate-spin w-6 h-6" />
      </div>
    )
  if (!user) return <Navigate to="/login" replace />

  const noImageCount = products.filter((p) => !p.image_url || p.image_url.trim() === '').length

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
    const matchesNoImage = filterNoImage ? !p.image_url || p.image_url.trim() === '' : true
    return matchesSearch && matchesNoImage
  })

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
      toast({ title: 'Sucesso', description: 'Produtos excluídos com sucesso.' })
      clearSelection()
      setShowDeleteConfirm(false)
      fetchData()
    }
  }

  const executeExportCSV = () => {
    const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id))
    const headers = ALL_EXPORT_FIELDS.filter((f) => selectedExportFields.includes(f))

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""'
      const str = String(val)
      return `"${str.replace(/"/g, '""')}"`
    }

    const csvRows = selectedProducts.map((p) => {
      return headers
        .map((header) => {
          if (header === 'ncm') return escapeCsv(formatNCM(p.ncm))
          const val = p[header as keyof Product]
          return escapeCsv(val)
        })
        .join(',')
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

    toast({ title: 'Sucesso', description: 'Exportação concluída. Arquivo baixado.' })
    setShowExportModal(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir equipamento do catálogo?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else fetchData()
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const toggleNoImageFilter = () => {
    setFilterNoImage((prev) => {
      const next = !prev
      if (next) {
        setSortColumn('created_at')
        setSortDirection('desc')
      }
      return next
    })
  }

  const renderSortIndicator = (column: string) => {
    if (sortColumn !== column) return null
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-[14px] h-[14px] ml-[6px] text-primary animate-in fade-in duration-150" />
    ) : (
      <ArrowDown className="w-[14px] h-[14px] ml-[6px] text-primary animate-in fade-in duration-150" />
    )
  }

  const sortableHeaderClasses = (column: string) => {
    const isActive = sortColumn === column
    return cn(
      'cursor-pointer select-none transition-all duration-200 ease-in-out',
      'hover:bg-foreground/5 hover:text-primary',
      isActive && 'font-semibold text-primary bg-primary/[0.08]',
    )
  }

  const userRole = String(
    user?.user_metadata?.role || user?.app_metadata?.role || 'admin',
  ).toLowerCase()
  const canToggleStatus = ['admin', 'administrador', 'colaborador'].includes(userRole)

  const handleToggleStatus = async (product: Product) => {
    if (!canToggleStatus) return
    const newStatus = !product.is_discontinued

    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_discontinued: newStatus } : p)),
    )
    setTogglingIds((prev) => new Set(prev).add(product.id))

    const { error } = await supabase
      .from('products')
      .update({ is_discontinued: newStatus })
      .eq('id', product.id)

    setTogglingIds((prev) => {
      const next = new Set(prev)
      next.delete(product.id)
      return next
    })

    if (error) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_discontinued: product.is_discontinued } : p,
        ),
      )
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar status. Tente novamente.',
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Sucesso', description: 'Status atualizado com sucesso.' })
    }
  }

  return (
    <AdminLayout breadcrumb="Catálogo & Produtos">
      <div className="flex flex-col gap-8 max-w-7xl mx-auto animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <Package className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Catálogo & Produtos</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <AdminCSVUploader
              manufacturers={manufacturers}
              onSuccess={fetchData}
              onAddManufacturer={fetchData}
            />
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
              onClick={() => {
                sessionStorage.setItem(
                  'admin-products-scroll-position',
                  JSON.stringify({ x: window.scrollX, y: window.scrollY }),
                )
              }}
              asChild
            >
              <Link to="/products/new">
                <Plus className="w-4 h-4 mr-2" /> Novo Equipamento
              </Link>
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm relative">
          <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h2 className="font-semibold text-foreground">
              Inventário ({filteredProducts.length} itens)
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Button
                variant={filterNoImage ? 'secondary' : 'outline'}
                size="sm"
                onClick={toggleNoImageFilter}
                className={cn(
                  'h-9 whitespace-nowrap',
                  filterNoImage &&
                    'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30',
                )}
              >
                <ImageOff className="w-4 h-4 mr-2" />
                Sem Imagem
                <Badge variant="secondary" className="ml-2 bg-background/50 text-foreground">
                  {noImageCount}
                </Badge>
              </Button>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar equipamento..."
                  className="pl-10 pr-10 bg-background/50 border-border/50 h-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search.length > 0 && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-full transition-colors flex items-center justify-center"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {selectedProductIds.length > 0 && (
            <div className="bg-background/95 backdrop-blur-sm border-b md:border-b md:border-t-0 border-t border-border/50 p-3 flex flex-col md:flex-row items-center justify-between gap-3 z-30 transition-all fixed bottom-0 left-0 right-0 md:static shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-none">
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
                  onClick={() => setShowExportModal(true)}
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
                    <Checkbox checked={isAllVisibleSelected} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead className="w-16">Mídia</TableHead>
                  <TableHead
                    className={cn('w-32', sortableHeaderClasses('is_discontinued'))}
                    onClick={() => handleSort('is_discontinued')}
                  >
                    <div className="flex items-center">
                      Status {renderSortIndicator('is_discontinued')}
                    </div>
                  </TableHead>
                  <TableHead
                    className={sortableHeaderClasses('name')}
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">Produto {renderSortIndicator('name')}</div>
                  </TableHead>
                  <TableHead className="w-32">Status da Imagem</TableHead>
                  <TableHead
                    className={sortableHeaderClasses('brand')}
                    onClick={() => handleSort('brand')}
                  >
                    <div className="flex items-center">Marca {renderSortIndicator('brand')}</div>
                  </TableHead>
                  <TableHead
                    className={sortableHeaderClasses('sku')}
                    onClick={() => handleSort('sku')}
                  >
                    <div className="flex items-center">SKU {renderSortIndicator('sku')}</div>
                  </TableHead>
                  <TableHead
                    className={cn('text-right', sortableHeaderClasses('price_usd'))}
                    onClick={() => handleSort('price_usd')}
                  >
                    <div className="flex items-center justify-end">
                      FOB Miami {renderSortIndicator('price_usd')}
                    </div>
                  </TableHead>
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
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canToggleStatus || togglingIds.has(p.id)}
                        onClick={() => handleToggleStatus(p)}
                        className={cn(
                          'h-7 text-xs px-2 w-[110px] flex items-center justify-center transition-colors',
                          p.is_discontinued
                            ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/20'
                            : 'bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20',
                        )}
                      >
                        {togglingIds.has(p.id) ? (
                          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                        ) : null}
                        {p.is_discontinued ? 'Descontinuado' : 'Ativo'}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px]" title={p.name}>
                      <div className="flex items-center gap-2">
                        <span className="truncate">{p.name}</span>
                        {p.is_discontinued && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] h-4 px-1 py-0 uppercase tracking-wider shrink-0"
                          >
                            Inativo
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {!p.image_url || p.image_url.trim() === '' ? (
                        <Badge
                          variant="destructive"
                          className="text-[10px] uppercase whitespace-nowrap"
                        >
                          Sem Imagem
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px] uppercase whitespace-nowrap"
                        >
                          Com Imagem
                        </Badge>
                      )}
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
                          sessionStorage.setItem(
                            'admin-products-scroll-position',
                            JSON.stringify({ x: window.scrollX, y: window.scrollY }),
                          )
                        }}
                        className="hover:bg-accent/10 hover:text-accent transition-colors"
                        asChild
                      >
                        <Link to={`/products/edit/${p.id}`}>
                          <Edit className="w-4 h-4" />
                        </Link>
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
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      Nenhum equipamento encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
          <DialogContent className="max-w-md bg-card border-border/50">
            <DialogHeader>
              <DialogTitle>Exportar CSV de Produtos</DialogTitle>
              <DialogDescription>
                Selecione os campos que deseja incluir no arquivo exportado.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-border/50">
                <Checkbox
                  id="export-all"
                  checked={selectedExportFields.length === ALL_EXPORT_FIELDS.length}
                  onCheckedChange={(checked) =>
                    setSelectedExportFields(checked ? ALL_EXPORT_FIELDS : [])
                  }
                />
                <Label htmlFor="export-all" className="font-semibold cursor-pointer">
                  Selecionar Todos
                </Label>
              </div>
              <div className="overflow-y-auto max-h-[40vh] pr-2">
                <div className="grid grid-cols-2 gap-3">
                  {ALL_EXPORT_FIELDS.map((field) => (
                    <div key={field} className="flex items-center space-x-2">
                      <Checkbox
                        id={`export-${field}`}
                        checked={selectedExportFields.includes(field)}
                        onCheckedChange={(checked) =>
                          setSelectedExportFields((prev) =>
                            checked ? [...prev, field] : prev.filter((f) => f !== field),
                          )
                        }
                      />
                      <Label
                        htmlFor={`export-${field}`}
                        className="text-sm font-normal cursor-pointer truncate"
                        title={field}
                      >
                        {field}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExportModal(false)}>
                Cancelar
              </Button>
              <Button onClick={executeExportCSV} disabled={selectedExportFields.length === 0}>
                Confirmar Exportação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir {selectedProductIds.length} produtos? Esta ação não
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

        <ScrollToTopButton />
      </div>
    </AdminLayout>
  )
}
