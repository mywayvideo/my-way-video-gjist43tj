import { useState } from 'react'
import { useProductStore } from '@/stores/useProductStore'
import { Product } from '@/lib/mockData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface AdminProductFormProps {
  initialData: Product | null
  onSuccess: () => void
}

export function AdminProductForm({ initialData, onSuccess }: AdminProductFormProps) {
  const { addProduct, updateProduct } = useProductStore()

  const [formData, setFormData] = useState<Partial<Product>>(
    initialData || {
      name: '',
      brand: '',
      category: '',
      price: 0,
      image: 'https://img.usecurling.com/p/600/600?q=camera',
      stockQuantity: 0,
      inStock: false,
      deliveryModes: 'Expressa 1 dia, Normal 3 dias',
      description: '',
      specs: { Sensor: 'Full-Frame', Montagem: 'E-Mount' },
    },
  )

  const [specsText, setSpecsText] = useState(() => {
    if (!initialData) return 'Sensor: Full-Frame\nMontagem: E-Mount\nResolução: 4K'
    return Object.entries(initialData.specs)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'price' || name === 'stockQuantity' ? Number(value) : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Parse specs from text area
    const specsObj: Record<string, string> = {}
    specsText.split('\n').forEach((line) => {
      const parts = line.split(':')
      if (parts.length >= 2) {
        specsObj[parts[0].trim()] = parts.slice(1).join(':').trim()
      }
    })

    const finalData = {
      ...formData,
      inStock: (formData.stockQuantity || 0) > 0,
      specs: specsObj,
    } as Product

    if (initialData?.id) {
      updateProduct(initialData.id, finalData)
    } else {
      addProduct(finalData)
    }
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-muted-foreground">
            Nome do Produto
          </Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="bg-background/50 border-white/10 focus-visible:ring-accent"
            placeholder="Ex: Sony FX3"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand" className="text-muted-foreground">
            Marca
          </Label>
          <Input
            id="brand"
            name="brand"
            value={formData.brand}
            onChange={handleChange}
            required
            className="bg-background/50 border-white/10 focus-visible:ring-accent"
            placeholder="Ex: Sony"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category" className="text-muted-foreground">
            Categoria
          </Label>
          <Input
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            className="bg-background/50 border-white/10 focus-visible:ring-accent"
            placeholder="Ex: Câmeras"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price" className="text-muted-foreground">
            Preço (R$)
          </Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={handleChange}
            required
            className="bg-background/50 border-white/10 focus-visible:ring-accent"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stockQuantity" className="text-muted-foreground">
            Quantidade em Estoque
          </Label>
          <Input
            id="stockQuantity"
            name="stockQuantity"
            type="number"
            value={formData.stockQuantity}
            onChange={handleChange}
            required
            className="bg-background/50 border-white/10 focus-visible:ring-accent"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deliveryModes" className="text-muted-foreground">
            Modalidades de Entrega
          </Label>
          <Input
            id="deliveryModes"
            name="deliveryModes"
            value={formData.deliveryModes}
            onChange={handleChange}
            required
            placeholder="Ex: Expressa, Retirada"
            className="bg-background/50 border-white/10 focus-visible:ring-accent"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="image" className="text-muted-foreground">
            URL da Imagem
          </Label>
          <Input
            id="image"
            name="image"
            value={formData.image}
            onChange={handleChange}
            required
            className="bg-background/50 border-white/10 focus-visible:ring-accent font-mono text-sm"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description" className="text-muted-foreground">
            Descrição Detalhada
          </Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            className="bg-background/50 border-white/10 focus-visible:ring-accent min-h-[100px]"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="specs" className="text-muted-foreground flex justify-between">
            <span>Especificações Técnicas</span>
            <span className="text-xs opacity-50 font-mono">Formato: "Chave: Valor"</span>
          </Label>
          <Textarea
            id="specs"
            value={specsText}
            onChange={(e) => setSpecsText(e.target.value)}
            className="bg-background/50 border-white/10 focus-visible:ring-accent font-mono text-sm min-h-[120px]"
            placeholder="Sensor: Full-Frame&#10;Resolução: 4K"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
        <Button type="button" variant="ghost" onClick={onSuccess} className="hover:bg-white/5">
          Cancelar
        </Button>
        <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90 px-8">
          {initialData ? 'Salvar Alterações' : 'Criar Produto no Banco'}
        </Button>
      </div>
    </form>
  )
}
