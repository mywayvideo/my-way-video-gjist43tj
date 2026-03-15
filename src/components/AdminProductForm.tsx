import { useState } from 'react'
import { Product } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/hooks/use-toast'

interface AdminProductFormProps {
  initialData: Product | null
  onSuccess: () => void
}

export function AdminProductForm({ initialData, onSuccess }: AdminProductFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Product>>(
    initialData || {
      name: '',
      sku: '',
      category: '',
      price_brl: 0,
      stock: 0,
      image_url: '',
      description: '',
      ncm: '',
      weight: 0,
      dimensions: '',
      is_special: false,
    },
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const numericFields = ['price_brl', 'stock', 'weight']
    setFormData((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload = { ...formData }
    delete payload.id
    delete payload.created_at

    let error
    if (initialData?.id) {
      const res = await supabase.from('products').update(payload).eq('id', initialData.id)
      error = res.error
    } else {
      const res = await supabase.from('products').insert([payload])
      error = res.error
    }

    setLoading(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Produto salvo no Supabase.' })
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Produto</Label>
          <Input
            id="name"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            required
            className="bg-background/50 border-white/10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">SKU (Código único)</Label>
          <Input
            id="sku"
            name="sku"
            value={formData.sku || ''}
            onChange={handleChange}
            required
            className="bg-background/50 border-white/10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Input
            id="category"
            name="category"
            value={formData.category || ''}
            onChange={handleChange}
            className="bg-background/50 border-white/10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock">Estoque</Label>
          <Input
            id="stock"
            name="stock"
            type="number"
            value={formData.stock || 0}
            onChange={handleChange}
            required
            className="bg-background/50 border-white/10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price_brl">Preço (BRL)</Label>
          <Input
            id="price_brl"
            name="price_brl"
            type="number"
            step="0.01"
            value={formData.price_brl || 0}
            onChange={handleChange}
            required
            className="bg-background/50 border-white/10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="image_url">URL da Imagem</Label>
          <Input
            id="image_url"
            name="image_url"
            value={formData.image_url || ''}
            onChange={handleChange}
            className="bg-background/50 border-white/10"
          />
        </div>

        <div className="flex flex-row items-center justify-between rounded-lg border border-white/10 bg-background/50 p-3 shadow-sm md:col-span-2">
          <div className="space-y-0.5">
            <Label htmlFor="is_special" className="text-base text-amber-500 font-semibold">
              Produto "SPECIAL"
            </Label>
            <p className="text-sm text-muted-foreground">
              Destacar este equipamento na página inicial em uma seção especial.
            </p>
          </div>
          <Switch
            id="is_special"
            checked={formData.is_special || false}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_special: checked }))}
            className="data-[state=checked]:bg-amber-500"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            className="bg-background/50 border-white/10 min-h-[100px]"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
        <Button type="button" variant="ghost" onClick={onSuccess} className="hover:bg-white/5">
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-accent text-accent-foreground hover:bg-accent/90 px-8"
        >
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  )
}
