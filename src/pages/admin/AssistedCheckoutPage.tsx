import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Search, ArrowLeft, Trash2, ShoppingCart } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function AssistedCheckoutPage() {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exRate, setExRate] = useState(5.0)
  const [discountRate, setDiscountRate] = useState(0)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  useEffect(() => {
    const load = async () => {
      try {
        const [custRes, exRes, prodRes] = await Promise.all([
          supabase.from('customers').select('*').eq('id', customerId).single(),
          supabase
            .from('exchange_rate')
            .select('usd_to_brl')
            .order('created_at', { ascending: false })
            .limit(1)
            .single(),
          supabase.from('products').select('*, manufacturers(name)').limit(20),
        ])

        setCustomer(custRes.data)
        if (exRes.data) setExRate(exRes.data.usd_to_brl)
        if (prodRes.data) setProducts(prodRes.data)

        if (custRes.data?.role === 'vip') setDiscountRate(10)
        if (custRes.data?.role === 'reseller') setDiscountRate(15)
      } catch (e) {
        toast({ title: 'Erro', description: 'Erro ao carregar dados.', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [customerId])

  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = supabase.from('products').select('*, manufacturers(name)').limit(20)
      if (search) q.ilike('name', `%${search}%`)
      const { data } = await q
      if (data) setProducts(data)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const subtotal = cart.reduce(
    (sum, item) => sum + (item.product.price_usd || 0) * item.quantity,
    0,
  )
  const discount = subtotal * (discountRate / 100)
  const totalUsd = subtotal - discount
  const totalBrl = totalUsd * exRate

  const handleSave = async () => {
    if (!cart.length)
      return toast({ title: 'Erro', description: 'Carrinho vazio.', variant: 'destructive' })
    setSaving(true)
    try {
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          order_number: `ORD-${Date.now().toString().slice(-6)}`,
          status: 'pending',
          subtotal,
          discount_amount: discount,
          total: totalUsd,
        })
        .select()
        .single()

      if (orderErr) throw orderErr

      const items = cart.map((i) => ({
        order_id: order.id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.product.price_usd || 0,
        total_price: (i.product.price_usd || 0) * i.quantity,
      }))

      const { error: itemsErr } = await supabase.from('order_items').insert(items)
      if (itemsErr) throw itemsErr

      toast({
        title: 'Sucesso',
        description: `Pedido criado com sucesso para ${customer.full_name || customer.email}!`,
      })
      navigate('/dashboard-admin')
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel salvar o pedido.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div className="p-8 space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  if (!customer)
    return <div className="p-8 text-center text-red-500 font-bold">Cliente nao encontrado</div>

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl space-y-6">
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/dashboard-admin')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            Checkout Assistido: {customer.full_name || 'Cliente sem nome'}
            <Badge
              variant={customer.role === 'admin' ? 'destructive' : 'default'}
              className="uppercase"
            >
              {customer.role}
            </Badge>
          </h1>
          <p className="text-muted-foreground">{customer.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="flex flex-col h-[70vh] min-h-[500px]">
          <CardHeader className="pb-3">
            <CardTitle>Selecionar Produtos</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <ScrollArea className="flex-1 px-6 pb-6">
            <div className="space-y-3">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-4 bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium line-clamp-1">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      SKU: {p.sku || 'N/A'} | {p.manufacturers?.name || 'Genérico'}
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      USD {p.price_usd?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="999"
                      value={quantities[p.id] || 1}
                      onChange={(e) =>
                        setQuantities({ ...quantities, [p.id]: parseInt(e.target.value) || 1 })
                      }
                      className="w-16 h-9"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const qty = quantities[p.id] || 1
                        setCart((prev) =>
                          prev.find((i) => i.product.id === p.id)
                            ? prev.map((i) =>
                                i.product.id === p.id ? { ...i, quantity: i.quantity + qty } : i,
                              )
                            : [...prev, { product: p, quantity: qty }],
                        )
                        setQuantities({ ...quantities, [p.id]: 1 })
                      }}
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
              ))}
              {!products.length && (
                <p className="text-center text-muted-foreground py-8">Nenhum produto encontrado.</p>
              )}
            </div>
          </ScrollArea>
        </Card>

        <Card className="flex flex-col h-[70vh] min-h-[500px] border-primary/20 shadow-md">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Resumo do Pedido</span>
              <Badge variant="secondary" className="text-sm">
                {cart.length} itens
              </Badge>
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex justify-between items-center p-3 bg-muted/40 rounded-lg border border-muted"
                >
                  <div className="flex-1 pr-4">
                    <p className="font-medium line-clamp-1">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity}x USD {item.product.price_usd?.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">
                      USD {(item.quantity * (item.product.price_usd || 0)).toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                      onClick={() => setCart(cart.filter((i) => i.product.id !== item.product.id))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {!cart.length && (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center">
                  <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                  <p>Carrinho vazio</p>
                  <p className="text-sm opacity-70">Adicione produtos na lista ao lado.</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-6 border-t bg-muted/10 space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal:</span>
              <span>USD {subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600 font-medium">
                <span>Desconto ({discountRate}%):</span>
                <span>- USD {discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Frete:</span>
              <span>Calculado no Checkout</span>
            </div>
            <div className="flex justify-between font-bold text-xl pt-3 border-t mt-2">
              <span>Total Estimado:</span>
              <span className="text-primary">R$ {totalBrl.toFixed(2)}</span>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/dashboard-admin')}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || !cart.length}>
                {saving ? 'Salvando...' : 'Salvar Pedido'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
