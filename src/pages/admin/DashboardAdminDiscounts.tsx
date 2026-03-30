import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Edit, Trash, Copy, Search, AlertCircle, RefreshCw, Tag } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from 'react-router-dom'
import { useDebounce } from '@/hooks/use-debounce'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function DashboardAdminDiscounts({
  discounts,
  discountsTotal,
  loadingDiscounts,
  error,
  fetchDiscounts,
  deleteDiscount,
  duplicateDiscount,
}: any) {
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(searchTerm, 300)

  useEffect(() => {
    fetchDiscounts(page, 10, debouncedSearch)
  }, [page, debouncedSearch, fetchDiscounts])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome da regra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button asChild className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-semibold">
          <Link to="/admin/discount/new">Criar Nova Regra</Link>
        </Button>
      </div>

      {error ? (
        <div className="text-center p-8">
          <AlertCircle className="mx-auto text-red-500 mb-2" />
          <p>{error}</p>
          <Button onClick={() => fetchDiscounts(page, 10, debouncedSearch)} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" /> Tentar Novamente
          </Button>
        </div>
      ) : loadingDiscounts ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : discounts.length === 0 ? (
        <div className="text-center p-12 border border-dashed rounded-lg">
          <Tag className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            Nenhuma regra de desconto encontrada. Clique em Criar Nova Regra.
          </p>
        </div>
      ) : (
        <div className="w-full">
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 text-muted-foreground font-medium border-b">
            <div className="col-span-3">Nome da Regra</div>
            <div className="col-span-2">Tipo de Desconto</div>
            <div className="col-span-2">Valor</div>
            <div className="col-span-2">Escopo</div>
            <div className="col-span-1">Clientes</div>
            <div className="col-span-2">Ação</div>
          </div>
          {discounts.map((d: any) => (
            <DiscountRow
              key={d.id}
              discount={d}
              onDelete={deleteDiscount}
              onDuplicate={duplicateDiscount}
            />
          ))}

          <div className="flex justify-between items-center mt-6">
            <Button disabled={page === 1} onClick={() => setPage((p) => p - 1)} variant="outline">
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">Página {page}</span>
            <Button
              disabled={page * 10 >= discountsTotal}
              onClick={() => setPage((p) => p + 1)}
              variant="outline"
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function DiscountRow({ discount, onDelete, onDuplicate }: any) {
  const { toast } = useToast()

  const handleDelete = async () => {
    try {
      await onDelete(discount.id)
      toast({ title: 'Regra deletada com sucesso!' })
    } catch (e) {
      toast({ title: 'Não foi possível deletar a regra.', variant: 'destructive' })
    }
  }

  const handleDuplicate = async () => {
    try {
      await onDuplicate(discount.id)
      toast({ title: 'Regra duplicada com sucesso!' })
    } catch (e) {
      toast({ title: 'Não foi possível duplicar a regra.', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col md:grid md:grid-cols-12 gap-4 p-4 border-b md:border-b-0 md:border-t md:items-center">
      <div className="md:col-span-3 font-semibold md:font-normal">
        <span className="md:hidden font-medium text-xs text-muted-foreground block mb-1">Nome</span>
        {discount.rule_name}
      </div>
      <div className="md:col-span-2 text-sm">
        <span className="md:hidden font-medium text-xs text-muted-foreground block mb-1">Tipo</span>
        {discount.discount_calculation_type === 'margin_percentage' ? 'Margem %' : 'Price USA %'}
      </div>
      <div className="md:col-span-2 text-sm">
        <span className="md:hidden font-medium text-xs text-muted-foreground block mb-1">
          Valor
        </span>
        {discount.discount_value}%
      </div>
      <div className="md:col-span-2 text-sm">
        <span className="md:hidden font-medium text-xs text-muted-foreground block mb-1">
          Escopo
        </span>
        {discount.scope_type}
      </div>
      <div className="md:col-span-1 text-sm">
        <span className="md:hidden font-medium text-xs text-muted-foreground block mb-1">
          Clientes
        </span>
        {discount.customerCount} clientes
      </div>
      <div className="md:col-span-2 flex items-center gap-2">
        <span className="md:hidden font-medium text-xs text-muted-foreground w-full mb-1">
          Ação
        </span>
        <Button asChild size="icon" variant="ghost" className="text-blue-500 hover:text-blue-600">
          <Link to={`/admin/discount/${discount.id}`}>
            <Edit className="w-4 h-4" />
          </Link>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-purple-500 hover:text-purple-600"
          onClick={handleDuplicate}
        >
          <Copy className="w-4 h-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600">
              <Trash className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar Regra?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar esta regra?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600">
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
