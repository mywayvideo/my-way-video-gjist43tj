import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Edit, Trash, Copy, Search, AlertCircle, RefreshCw, Tag, X } from 'lucide-react'
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
          <Search className="absolute left-[12px] top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Buscar por nome da regra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-[40px] pr-[12px] py-[10px] border border-border rounded-[8px] text-[14px] focus-visible:ring-[3px] focus-visible:ring-yellow-500/10 focus-visible:border-yellow-500 transition-all outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-[12px] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          asChild
          className="px-[24px] py-[10px] bg-yellow-500 text-black font-semibold rounded-[8px] hover:bg-yellow-600 hover:scale-105 transition-all duration-150"
        >
          <Link to="/admin/discount/new">Criar Nova Regra</Link>
        </Button>
      </div>

      {error ? (
        <div className="text-center py-[48px] px-[24px]">
          <AlertCircle className="mx-auto text-[64px] h-[64px] w-[64px] text-gray-300 mb-[16px]" />
          <h3 className="text-[18px] font-semibold text-foreground mb-[8px]">
            Não foi possível carregar regras.
          </h3>
          <p className="text-[14px] text-gray-500 mb-[24px]">{error}</p>
          <Button
            onClick={() => fetchDiscounts(page, 10, debouncedSearch)}
            className="px-[24px] py-[10px] bg-yellow-500 text-black font-semibold rounded-[8px] hover:bg-yellow-600 hover:scale-105 transition-all duration-150"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Tentar Novamente
          </Button>
        </div>
      ) : loadingDiscounts ? (
        <div className="space-y-[12px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[40px] rounded-[8px] w-full bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer"
            />
          ))}
        </div>
      ) : discounts?.length === 0 ? (
        <div className="text-center py-[48px] px-[24px]">
          <Tag className="mx-auto text-[64px] h-[64px] w-[64px] text-gray-300 mb-[16px]" />
          <h3 className="text-[18px] font-semibold text-foreground mb-[8px]">
            Nenhuma regra de desconto encontrada.
          </h3>
          <p className="text-[14px] text-gray-500 mb-[24px]">
            Clique em Criar Nova Regra para começar.
          </p>
          <Button
            asChild
            className="px-[24px] py-[10px] bg-yellow-500 text-black font-semibold rounded-[8px] hover:bg-yellow-600 hover:scale-105 transition-all duration-150"
          >
            <Link to="/admin/discount/new">Criar Nova Regra</Link>
          </Button>
        </div>
      ) : (
        <div className="w-full">
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="p-[12px] font-semibold text-[14px]">Nome da Regra</th>
                  <th className="p-[12px] font-semibold text-[14px]">Tipo de Desconto</th>
                  <th className="p-[12px] font-semibold text-[14px]">Valor</th>
                  <th className="p-[12px] font-semibold text-[14px]">Escopo</th>
                  <th className="p-[12px] font-semibold text-[14px]">Clientes</th>
                  <th className="p-[12px] font-semibold text-[14px]">Ação</th>
                </tr>
              </thead>
              <tbody>
                {discounts?.map((d: any) => (
                  <DiscountRow
                    key={d.id}
                    discount={d}
                    onDelete={deleteDiscount}
                    onDuplicate={duplicateDiscount}
                    isMobile={false}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col md:hidden">
            {discounts?.map((d: any) => (
              <DiscountRow
                key={d.id}
                discount={d}
                onDelete={deleteDiscount}
                onDuplicate={duplicateDiscount}
                isMobile={true}
              />
            ))}
          </div>

          <div className="flex justify-center items-center gap-[8px] mt-[24px]">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-[16px] py-[8px] border border-border rounded-[6px] text-[13px] hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="px-[12px] py-[8px] border border-border rounded-[6px] text-[13px] bg-yellow-500 text-black font-semibold">
              {page}
            </span>
            <button
              disabled={page * 10 >= discountsTotal}
              onClick={() => setPage((p) => p + 1)}
              className="px-[16px] py-[8px] border border-border rounded-[6px] text-[13px] hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DiscountRow({ discount, onDelete, onDuplicate, isMobile }: any) {
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

  const actions = (
    <div className="flex flex-wrap items-center gap-[8px]">
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
  )

  const scopeText =
    discount.scope_type === 'all_products'
      ? 'Todos os Produtos'
      : discount.scope_type === 'by_manufacturer'
        ? 'Por Fabricante'
        : discount.scope_type === 'by_category'
          ? 'Por Categoria'
          : discount.scope_type === 'individual_products'
            ? 'Individual'
            : discount.scope_type

  const typeText =
    discount.discount_calculation_type === 'margin_percentage' ? 'Margem %' : 'Price USA %'

  if (isMobile) {
    return (
      <div className="bg-card border border-border rounded-[12px] p-[16px] mb-[12px] flex flex-col gap-2">
        <div>
          <span className="font-bold text-[14px]">Nome:</span>{' '}
          <span className="text-[14px]">{discount.rule_name}</span>
        </div>
        <div>
          <span className="font-bold text-[14px]">Tipo:</span>{' '}
          <span className="text-[14px]">{typeText}</span>
        </div>
        <div>
          <span className="font-bold text-[14px]">Valor:</span>{' '}
          <span className="text-[14px]">{discount.discount_value}%</span>
        </div>
        <div>
          <span className="font-bold text-[14px]">Escopo:</span>{' '}
          <span className="text-[14px]">{scopeText}</span>
        </div>
        <div>
          <span className="font-bold text-[14px]">Clientes:</span>{' '}
          <span className="text-[14px]">{discount.customerCount} clientes</span>
        </div>
        <div className="mt-1">
          <span className="font-bold text-[14px] block mb-2">Ação:</span>
          {actions}
        </div>
      </div>
    )
  }

  return (
    <tr className="border-b border-border hover:bg-muted transition-colors">
      <td className="p-[12px] text-[14px]">{discount.rule_name}</td>
      <td className="p-[12px] text-[14px]">{typeText}</td>
      <td className="p-[12px] text-[14px]">{discount.discount_value}%</td>
      <td className="p-[12px] text-[14px]">{scopeText}</td>
      <td className="p-[12px] text-[14px]">{discount.customerCount} clientes</td>
      <td className="p-[12px]">{actions}</td>
    </tr>
  )
}
