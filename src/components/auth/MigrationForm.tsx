import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Lock, Eye, EyeOff, Loader2, User, Phone, FileText, MapPin } from 'lucide-react'

const Field = ({ id, icon: Icon, right, disabled, ...p }: any) => (
  <div className="relative">
    {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />}
    <Input
      id={id}
      disabled={disabled}
      className={`bg-zinc-900 border-zinc-800 text-white h-11 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed ${Icon ? 'pl-9' : 'pl-3'} ${right ? 'pr-9' : ''}`}
      {...p}
    />
    {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
  </div>
)

export function MigrationForm({
  email,
  initialData,
  onCancel,
  onProcessing,
  onError,
}: {
  email: string
  initialData: any
  onCancel: () => void
  onProcessing?: () => void
  onError?: () => void
}) {
  const [f, setF] = useState({
    pwd: '',
    conf: '',
    name: '',
    phone: '',
    cpf: '',
    zip: '',
    st: '',
    neigh: '',
    city: '',
    state: '',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (initialData) {
      const b = initialData.billing_address || {}
      setF({
        pwd: '',
        conf: '',
        name: initialData.full_name || '',
        phone: initialData.phone || '',
        cpf: initialData.cpf || '',
        zip: b.zip_code ?? '',
        st: b.street ?? '',
        neigh: b.neighborhood ?? '',
        city: b.city ?? '',
        state: b.state ?? '',
      })
    }
  }, [initialData])

  const hndl = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (f.pwd.length < 8) return setErr('A senha deve ter no mínimo 8 caracteres.')
    if (f.pwd !== f.conf) return setErr('As senhas não coincidem.')
    setLoading(true)
    if (onProcessing) onProcessing()
    setErr(null)

    try {
      await supabase.auth.signOut().catch(() => {})

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password: f.pwd,
        options: { data: { name: f.name } },
      })

      if (signUpError && !signUpError.message.toLowerCase().includes('already')) throw signUpError
      if (signUpError) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password: f.pwd,
        })
        if (signInErr) throw signInErr
      }

      await new Promise((r) => setTimeout(r, 1500))
      const { data: cu } = await supabase.auth.getUser()

      if (cu?.user) {
        const payload = {
          user_id: cu.user.id,
          full_name: f.name,
          phone: f.phone,
          cpf: f.cpf,
          billing_address: {
            ...(initialData?.billing_address || {}),
            zip_code: f.zip,
            street: f.st,
            neighborhood: f.neigh,
            city: f.city,
            state: f.state,
          },
          is_imported: false,
          has_migrated: true,
        }
        const { error: updateError } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', initialData.id)
        if (updateError) throw updateError
      }

      toast({ title: 'Conta ativada!', description: 'Sincronizando sessão...' })

      const role = initialData?.role || 'customer'
      const targetPath = role === 'admin' ? '/admin/dashboard' : '/dashboard'

      // FINAL FIX: Hard redirect to force the browser to recognize the new session
      window.location.href = targetPath
    } catch (e: any) {
      setErr(e.message || 'Erro ao ativar.')
      setLoading(false)
      if (onError) onError()
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 animate-fade-in">
      <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl text-orange-200 text-sm">
        Bem-vindo à nova MY WAY VIDEO! Você já é nosso parceiro e agora elevamos o nível: um portal
        inteligente com busca por IA, cotações automáticas e suporte especializado. Por segurança,
        defina sua nova senha e valide seus dados para acessar as novas ferramentas.
      </div>
      {err && <div className="p-2 bg-red-500/10 text-red-500 text-sm rounded">{err}</div>}

      <h3 className="text-sm text-zinc-400 border-b border-zinc-800 pb-1 mt-2">Segurança</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Nova Senha *</Label>
          <Field
            icon={Lock}
            type={showPwd ? 'text' : 'password'}
            required
            value={f.pwd}
            onChange={hndl('pwd')}
            disabled={loading}
            right={
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-zinc-500">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
        </div>
        <div>
          <Label>Confirmar Senha *</Label>
          <Field
            icon={Lock}
            type={showPwd ? 'text' : 'password'}
            required
            value={f.conf}
            onChange={hndl('conf')}
            disabled={loading}
          />
        </div>
      </div>

      <h3 className="text-sm text-zinc-400 border-b border-zinc-800 pb-1 mt-2">Pessoais</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Nome Completo *</Label>
          <Field icon={User} required value={f.name} onChange={hndl('name')} disabled={loading} />
        </div>
        <div>
          <Label>Telefone *</Label>
          <Field
            icon={Phone}
            required
            value={f.phone}
            onChange={hndl('phone')}
            disabled={loading}
          />
        </div>
        <div>
          <Label>CPF/CNPJ (Opcional)</Label>
          <Field icon={FileText} value={f.cpf} onChange={hndl('cpf')} disabled={loading} />
        </div>
      </div>

      <h3 className="text-sm text-zinc-400 border-b border-zinc-800 pb-1 mt-2">Endereço</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>CEP *</Label>
          <Field icon={MapPin} required value={f.zip} onChange={hndl('zip')} disabled={loading} />
        </div>
        <div className="col-span-2">
          <Label>Logradouro / Rua *</Label>
          <Field required value={f.st} onChange={hndl('st')} disabled={loading} />
        </div>
        <div>
          <Label>Bairro *</Label>
          <Field required value={f.neigh} onChange={hndl('neigh')} disabled={loading} />
        </div>
        <div>
          <Label>Cidade *</Label>
          <Field required value={f.city} onChange={hndl('city')} disabled={loading} />
        </div>
        <div className="col-span-2">
          <Label>Estado *</Label>
          <Field required value={f.state} onChange={hndl('state')} disabled={loading} />
        </div>
      </div>

      <div className="pt-2 space-y-2">
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#FF6600] hover:bg-[#FF6600]/90 text-white h-11 rounded-xl"
        >
          {loading ? (
            <div className="flex">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando...
            </div>
          ) : (
            'Ativar Conta'
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
          className="w-full text-zinc-400 hover:text-white"
        >
          Voltar para Login
        </Button>
      </div>
    </form>
  )
}
