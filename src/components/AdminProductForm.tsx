import { useState } from 'react'
import { Product, Manufacturer } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { UploadCloud, Plus } from 'lucide-react'
import { AdminManufacturerDialog } from './AdminManufacturerDialog'
import ReactMarkdown from 'react-markdown'

interface Props {
  initialData: Product | null
  manufacturers: Manufacturer[]
  onSuccess: () => void
  onAddManufacturer: () => void
}

export function AdminProductForm({
  initialData,
  manufacturers,
  onSuccess,
  onAddManufacturer,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showMfgDialog, setShowMfgDialog] = useState(false)

  const [formData, setFormData] = useState<Partial<Product>>(
    initialData || {
      name: '',
      sku: '',
      category: '',
      price_brl: 0,
      price_usd: 0,
      price_cost: 0,
      stock: 0,
      image_url: '',
      description: '',
      technical_info: '',
      ncm: '',
      weight: 0,
      dimensions: '',
      is_special: false,
      is_discontinued: false,
      manufacturer_id: '',
    },
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const numericFields = ['price_brl', 'price_usd', 'price_cost', 'stock', 'weight']
    setFormData((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) || 0 : value,
    }))
  }

  const handleImageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/'))
      return toast({ title: 'Formato inválido', variant: 'destructive' })

    setUploadingImage(true)
    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

    const { data, error } = await supabase.storage.from('product-images').upload(fileName, file)
    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' })
    } else if (data) {
      const {
        data: { publicUrl },
      } = supabase.storage.from('product-images').getPublicUrl(fileName)
      setFormData((prev) => ({ ...prev, image_url: publicUrl }))
    }
    setUploadingImage(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.manufacturer_id)
      return toast({
        title: 'Erro',
        description: 'Selecione um fabricante',
        variant: 'destructive',
      })
    setLoading(true)

    const payload = { ...formData }
    delete payload.id
    delete payload.created_at
    delete payload.manufacturer

    const isUpdate = !!initialData?.id

    const req = isUpdate
      ? supabase.from('products').update(payload).eq('id', initialData.id)
      : supabase.from('products').insert([payload])

    const { error } = await req
    setLoading(false)

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({
        title: 'Sucesso',
        description: isUpdate ? 'Produto atualizado com sucesso.' : 'Produto salvo no inventário.',
      })
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2 md:col-span-2">
          <Label>Imagem do Produto</Label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleImageDrop}
            className="border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-white/5 transition-colors cursor-pointer group relative overflow-hidden"
          >
            {uploadingImage ? (
              <p className="animate-pulse">Fazendo upload...</p>
            ) : formData.image_url ? (
              <div className="flex flex-col items-center">
                <img
                  src={formData.image_url}
                  alt="Preview"
                  className="h-32 object-contain mb-3 rounded"
                />
                <p className="text-xs">Arraste nova imagem para substituir</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud className="w-8 h-8 mb-2 group-hover:text-primary" />
                <p>Arraste uma imagem aqui ou preencha a URL abaixo</p>
              </div>
            )}
          </div>
          <Input
            id="image_url"
            name="image_url"
            value={formData.image_url || ''}
            onChange={handleChange}
            placeholder="https://..."
            className="bg-background/50 mt-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="manufacturer_id">Fabricante</Label>
          <div className="flex gap-2">
            <Select
              value={formData.manufacturer_id || ''}
              onValueChange={(v) => setFormData({ ...formData, manufacturer_id: v })}
            >
              <SelectTrigger className="bg-background/50 border-white/10 flex-1">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {manufacturers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowMfgDialog(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            name="sku"
            value={formData.sku || ''}
            onChange={handleChange}
            required
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Nome do Produto</Label>
          <Input
            id="name"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            required
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Input
            id="category"
            name="category"
            value={formData.category || ''}
            onChange={handleChange}
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ncm">NCM</Label>
          <Input
            id="ncm"
            name="ncm"
            value={formData.ncm || ''}
            onChange={handleChange}
            className="bg-background/50"
            placeholder="0000.00.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price_usd">Preço de Venda Miami (USD)</Label>
          <Input
            id="price_usd"
            name="price_usd"
            type="number"
            step="0.01"
            value={formData.price_usd || 0}
            onChange={handleChange}
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price_brl">Preço de Venda Brasil (USD)</Label>
          <Input
            id="price_brl"
            name="price_brl"
            type="number"
            step="0.01"
            value={formData.price_brl || 0}
            onChange={handleChange}
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price_cost" className="text-amber-500">
            Preço de Custo Miami (USD)
          </Label>
          <Input
            id="price_cost"
            name="price_cost"
            type="number"
            step="0.01"
            value={formData.price_cost || 0}
            onChange={handleChange}
            className="bg-background/50 border-amber-500/30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock">Estoque Local</Label>
          <Input
            id="stock"
            name="stock"
            type="number"
            value={formData.stock || 0}
            onChange={handleChange}
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight">Peso (lb)</Label>
          <Input
            id="weight"
            name="weight"
            type="number"
            step="0.01"
            value={formData.weight || 0}
            onChange={handleChange}
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dimensions">Dimensões (in)</Label>
          <Input
            id="dimensions"
            name="dimensions"
            value={formData.dimensions || ''}
            onChange={handleChange}
            className="bg-background/50"
            placeholder="10x10x10"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-background/50 p-3 md:col-span-2">
          <div>
            <Label className="text-amber-500">Produto "DESTAQUE"</Label>
            <p className="text-xs text-muted-foreground">Destacar na página inicial</p>
          </div>
          <Switch
            checked={formData.is_special || false}
            onCheckedChange={(c) => setFormData((p) => ({ ...p, is_special: c }))}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-3 md:col-span-2">
          <div>
            <Label className="text-destructive">Produto "DESCONTINUADO"</Label>
            <p className="text-xs text-muted-foreground">Marcar como fora de linha/indisponível</p>
          </div>
          <Switch
            checked={formData.is_discontinued || false}
            onCheckedChange={(c) => setFormData((p) => ({ ...p, is_discontinued: c }))}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Descrição Técnica</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            className="bg-background/50 min-h-[100px]"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="technical_info">Informacoes Tecnicas (Markdown/HTML)</Label>
          <Textarea
            id="technical_info"
            name="technical_info"
            value={formData.technical_info || ''}
            onChange={handleChange}
            placeholder={`## Especificacoes Avancadas\n\n**Recurso 1:** Descricao...`}
            className="bg-background/50 min-h-[200px]"
            rows={10}
          />
        </div>

        {formData.technical_info && (
          <div className="space-y-2 md:col-span-2">
            <Label>Preview</Label>
            <div className="p-4 border border-border/50 rounded-md bg-background/50 text-sm [&_h2]:text-[1.5rem] [&_h2]:font-[700] [&_h2]:mt-[1.5rem] [&_h2]:mb-[1rem] [&_h3]:text-[1.25rem] [&_h3]:font-[600] [&_h3]:mt-[1rem] [&_h3]:mb-[0.75rem] [&_strong]:font-[700] [&_strong]:text-primary [&_ul]:ml-[1.5rem] [&_ul]:mt-[0.5rem] [&_ul]:mb-[0.5rem] [&_ul]:list-disc [&_ol]:ml-[1.5rem] [&_ol]:mt-[0.5rem] [&_ol]:mb-[0.5rem] [&_ol]:list-decimal [&_li]:mb-[0.5rem] [&_blockquote]:border-l-[4px] [&_blockquote]:border-primary [&_blockquote]:pl-[1rem] [&_blockquote]:ml-0 [&_blockquote]:text-muted-foreground [&_code]:bg-muted [&_code]:py-[0.25rem] [&_code]:px-[0.5rem] [&_code]:rounded-[0.25rem] [&_code]:font-mono [&_pre]:bg-muted [&_pre]:p-[1rem] [&_pre]:rounded-[0.5rem] [&_pre]:overflow-x-auto [&_pre]:font-mono">
              <ReactMarkdown>{formData.technical_info}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
        <Button type="button" variant="ghost" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="px-8">
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      <AdminManufacturerDialog
        open={showMfgDialog}
        onOpenChange={setShowMfgDialog}
        onSuccess={(id) => {
          onAddManufacturer()
          setFormData((p) => ({ ...p, manufacturer_id: id }))
          setShowMfgDialog(false)
        }}
      />
    </form>
  )
}
