import { Customer } from '@/types/customer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CUSTOMER_LABELS } from '@/constants/customer'
import { useState, useRef } from 'react'
import { Pencil, Camera, Save, X, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { customerService } from '@/services/customerService'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

const profileSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  company_name: z.string().optional().nullable(),
  cpf: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || val.length === 11 || val.length === 14, 'CPF inválido se fornecido'),
})

export function PersonalInfoTab({
  customer,
  onSave,
  isEditing,
  setEditing,
}: {
  customer: Customer
  onSave: (data: Partial<Customer>) => Promise<void>
  isEditing: boolean
  setEditing: (editing: boolean) => void
}) {
  const { user } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: customer.full_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      date_of_birth: customer.date_of_birth || '',
      gender: customer.gender || '',
      company_name: customer.company_name || '',
      cpf: customer.cpf || '',
    },
  })

  const onSubmit = async (data: z.infer<typeof profileSchema>) => {
    await onSave(data)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setIsUploading(true)
    try {
      const url = await customerService.uploadProfilePhoto(user.id, file)
      await onSave({ profile_photo_url: url })
    } catch (err) {
      toast.error('Erro ao fazer upload da foto.')
    } finally {
      setIsUploading(false)
    }
  }

  if (!isEditing) {
    return (
      <Card className="border-border animate-fade-in-up">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:justify-between items-start gap-4 mb-6">
            <div className="flex items-center gap-6">
              <div className="relative w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden border shrink-0">
                {customer.profile_photo_url ? (
                  <img
                    src={customer.profile_photo_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold">{customer.full_name}</h3>
                <p className="text-muted-foreground text-sm">{customer.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              className="shrink-0"
            >
              <Pencil className="w-4 h-4 mr-2" /> Editar
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-6 border-t border-border/50">
            <div>
              <Label className="text-muted-foreground text-xs">{CUSTOMER_LABELS.phone}</Label>
              <p className="font-medium">{customer.phone || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">{CUSTOMER_LABELS.cpf}</Label>
              <p className="font-medium">{customer.cpf || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                {CUSTOMER_LABELS.date_of_birth}
              </Label>
              <p className="font-medium">
                {customer.date_of_birth
                  ? new Date(customer.date_of_birth).toLocaleDateString('pt-BR')
                  : '-'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">{CUSTOMER_LABELS.gender}</Label>
              <p className="font-medium capitalize">{customer.gender || '-'}</p>
            </div>
            <div className="md:col-span-2">
              <Label className="text-muted-foreground text-xs">
                {CUSTOMER_LABELS.company_name}
              </Label>
              <p className="font-medium">{customer.company_name || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-md animate-fade-in-up">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8 pb-6 border-b border-border">
          <div className="relative w-24 h-24 rounded-full bg-secondary flex items-center justify-center overflow-hidden border group shrink-0">
            {customer.profile_photo_url ? (
              <img
                src={customer.profile_photo_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera className="w-8 h-8 text-muted-foreground" />
            )}
            <div
              className="absolute inset-0 bg-black/50 hidden group-hover:flex flex-col items-center justify-center cursor-pointer transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
              <span className="text-[10px] text-white mt-1 font-medium">Mudar</span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={isUploading}
            />
          </div>
          <div>
            <h3 className="font-medium text-lg">Foto de Perfil</h3>
            <p className="text-sm text-muted-foreground">
              Clique na imagem para alterar. Formatos suportados: JPG, PNG.
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{CUSTOMER_LABELS.full_name}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{CUSTOMER_LABELS.email}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{CUSTOMER_LABELS.phone}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="(00) 00000-0000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{CUSTOMER_LABELS.cpf}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="000.000.000-00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{CUSTOMER_LABELS.date_of_birth}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{CUSTOMER_LABELS.gender}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                        <SelectItem value="prefiro_nao_dizer">Prefiro não dizer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{CUSTOMER_LABELS.company_name}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={form.formState.isSubmitting}
              >
                <X className="w-4 h-4 mr-2" /> Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
