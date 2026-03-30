import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Edit, Trash, Copy, Search, AlertCircle, RefreshCw, Tag, X } from 'lucide-react'
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Buscar por nome da regra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 border border-border rounded-lg text-[14px] focus-visible:ring-2 focus-visible:ring-yellow-500/20 focus-visible:border-yellow-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          asChild
          className="px-6 py-[10px] bg-yellow-500 text-black font-semibold rounded-[8px] hover:bg-yellow-600 hover:scale-105 transition-all"
        >
          <Link to="/admin/discount/new">Criar Nova Regra</Link>
        </Button>
      </div>

      {error ? (
        <div className="text-center py-[48px] px-6">
          <AlertCircle className="mx-auto h-[64px] w-[64px] text-red-500 mb-4" />
          <h3 className="text-[18px] font-semibold text-foreground mb-2">
            Não foi possível carregar regras.
          </h3>
          <p className="text-[14px] text-gray-500 mb-6">{error}</p>
          <Button
            onClick={() => fetchDiscounts(page, 10, debouncedSearch)}
            className="px-6 py-[10px] bg-yellow-500 text-black font-semibold rounded-[8px] hover:bg-yellow-600 hover:scale-105 transition-all"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Tentar Novamente
          </Button>
        </div>
      ) : loadingDiscounts ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[40px] rounded-[8px] w-full" />
          ))}
        </div>
      ) : discounts?.length === 0 ? (
        <div className="text-center py-[48px] px-6">
          <Tag className="mx-auto h-[64px] w-[64px] text-gray-300 mb-4" />
          <h3 className="text-[18px] font-semibold text-foreground mb-2">
            Nenhuma regra de desconto encontrada.
          </h3>
          <p className="text-[14px] text-gray-500 mb-6">Clique em Criar Nova Regra para começar.</p>
          <Button
            asChild
            className="px-6 py-[10px] bg-yellow-500 text-black font-semibold rounded-[8px] hover:bg-yellow-600 hover:scale-105 transition-all"
          >
            <Link to="/admin/discount/new">Criar Nova Regra</Link>
          </Button>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="hidden md:grid grid-cols-12 gap-4 p-3 bg-muted text-foreground font-semibold text-left border-b border-border rounded-t-lg">
            <div className="col-span-3">Nome da Regra</div>
            <div className="col-span-2">Tipo de Desconto</div>
            <div className="col-span-2">Valor</div>
            <div className="col-span-2">Escopo</div>
            <div className="col-span-1">Clientes</div>
            <div className="col-span-2">Ação</div>
          </div>
          <div className="flex flex-col gap-3 md:gap-0">
            {discounts?.map((d: any) => (
              <DiscountRow
                key={d.id}
                discount={d}
                onDelete={deleteDiscount}
                onDuplicate={duplicateDiscount}
              />
            ))}
          </div>

          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 border border-border rounded-[6px] text-[13px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              Anterior
            </button>
            <span className="px-3 py-2 border border-transparent rounded-[6px] text-[13px] bg-yellow-500 text-black font-semibold">
              {page}
            </span>
            <button
              disabled={page * 10 >= discountsTotal}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 border border-border rounded-[6px] text-[13px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              Próxima
            </button>
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
    <div className="flex flex-col md:grid md:grid-cols-12 gap-4 p-4 md:p-3 bg-card md:bg-transparent rounded-[12px] md:rounded-none shadow-sm md:shadow-none border border-border md:border-t-0 hover:bg-muted/50 transition-colors md:items-center">
      <div className="md:col-span-3 font-normal text-[14px]">
        <span className="md:hidden font-bold text-[14px] block mb-1">Nome</span>
        {discount.rule_name}
      </div>
      <div className="md:col-span-2 text-[14px]">
        <span className="md:hidden font-bold text-[14px] block mb-1">Tipo</span>
        {discount.discount_calculation_type === 'margin_percentage' ? 'Margem %' : 'Price USA %'}
      </div>
      <div className="md:col-span-2 text-[14px]">
        <span className="md:hidden font-bold text-[14px] block mb-1">Valor</span>
        {discount.discount_value}%
      </div>
      <div className="md:col-span-2 text-[14px]">
        <span className="md:hidden font-bold text-[14px] block mb-1">Escopo</span>
        {discount.scope_type === 'all_products'
          ? 'Todos os Produtos'
          : discount.scope_type === 'by_manufacturer'
            ? 'Por Fabricante'
            : discount.scope_type === 'by_category'
              ? 'Por Categoria'
              : discount.scope_type === 'individual_products'
                ? 'Individual'
                : discount.scope_type}
      </div>
      <div className="md:col-span-1 text-[14px]">
        <span className="md:hidden font-bold text-[14px] block mb-1">Clientes</span>
        {discount.customerCount} clientes
      </div>
      <div className="md:col-span-2 flex flex-wrap items-center gap-2">
        <span className="md:hidden font-bold text-[14px] w-full block mb-1">Ação</span>
        <Link
          to={`/admin/discount/${discount.id}`}
          className="w-[40px] h-[40px] flex items-center justify-center bg-blue-600 text-white rounded-[6px] hover:bg-blue-700 hover:scale-105 transition-all duration-150"
          title="Editar"
        >
          <Edit className="w-5 h-5" />
        </Link>
        <button
          onClick={handleDuplicate}
          className="w-[40px] h-[40px] flex items-center justify-center bg-purple-600 text-white rounded-[6px] hover:bg-purple-700 hover:scale-105 transition-all duration-150"
          title="Duplicar"
        >
          <Copy className="w-5 h-5" />
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="w-[40px] h-[40px] flex items-center justify-center bg-red-600 text-white rounded-[6px] hover:bg-red-700 hover:scale-105 transition-all duration-150"
              title="Deletar"
            >
              <Trash className="w-5 h-5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza que deseja deletar esta regra?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A regra deixará de ser aplicada aos clientes
                imediatamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
