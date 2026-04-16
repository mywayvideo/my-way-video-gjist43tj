import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Lock, Eye, EyeOff, Loader2, User, Phone, FileText, MapPin } from 'lucide-react'
import logoImg from '../assets/mw_logo_horiz_1200x318_fundo_escuro-037e3.png'

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

export default function MigrationSetup() {
  const [searchParams] = useSearchParams()
  const emailParam = searchParams.get('email')
  const email = emailParam ? emailParam.toLowerCase() : null

  const [loadingData, setLoadingData] = useState(true)
  const [customerData, setCustomerData] = useState<any>(null)
  const [isActivating, setIsActivating] = useState(false)
  const isActivatingRef = useRef(false)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')

  const [zipCode, setZipCode] = useState('')
  const [street, setStreet] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')

  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nav = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    isActivatingRef.current = isActivating
  }, [isActivating])

  useEffect(() => {
    const fetchCustomer = async () => {
      if (isActivatingRef.current) return

      if (!email) {
        nav('/login', { replace: true })
        return
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .eq('is_imported', true)
        .maybeSingle()

      if (isActivatingRef.current) return

      if (error || !data) {
        nav('/login', { replace: true })
        return
      }

      setCustomerData(data)
      setFullName(data.full_name || '')
      setPhone(data.phone || '')
      setCpf(data.cpf || '')

      const billing = (data.billing_address as any) || {}
      setZipCode(billing.zip_code || '')
      setStreet(billing.street || '')
      setNeighborhood(billing.neighborhood || '')
      setCity(billing.city || '')
      setState(billing.state || '')

      setLoadingData(false)
    }

    fetchCustomer()
  }, [email, nav, isActivating])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return setError('Email inválido ou não fornecido.')
    if (password.length < 8) return setError('A senha deve ter no mínimo 8 caracteres.')
    if (password !== confirmPassword) return setError('As senhas não coincidem.')

    setLoading(true)
    setIsActivating(true)
    isActivatingRef.current = true
    setError(null)

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      let newUserId = authData?.user?.id

      if (signUpError) {
        if (!signUpError.message.toLowerCase().includes('already')) {
          throw signUpError
        } else {
          // Se já registrado, tenta autenticar para forçar login
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (!signInError && signInData?.user) {
            newUserId = signInData.user.id
          }
        }
      }

      const updatedBilling = {
        ...(customerData.billing_address || {}),
        zip_code: zipCode,
        street,
        neighborhood,
        city,
        state,
      }

      const updatePayload: any = {
        full_name: fullName,
        phone,
        cpf,
        billing_address: updatedBilling,
        is_imported: false,
        has_migrated: true,
      }

      if (newUserId) {
        updatePayload.user_id = newUserId
      }

      const { error: updateError } = await supabase
        .from('customers')
        .update(updatePayload)
        .eq('id', customerData.id)

      if (updateError) throw updateError

      await supabase.auth.refreshSession()

      // Aguarda o AuthContext sincronizar a sessão antes do redirecionamento final
      await new Promise((resolve) => setTimeout(resolve, 600))

      toast({
        title: 'Conta ativada com sucesso!',
        description: 'Aproveite nosso novo portal.',
      })

      nav('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Erro ao ativar conta. Tente novamente.')
      setIsActivating(false)
      isActivatingRef.current = false
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-black flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6600]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center p-4 relative overflow-y-auto py-12">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="w-full max-w-[600px] z-10 animate-fade-in-up">
        <div className="flex justify-center mb-6">
          <Link to="/" className="hover:scale-105 transition-transform">
            <img src={logoImg} alt="Logo" className="w-[180px] object-contain" />
          </Link>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 relative">
          <h2 className="text-2xl font-medium text-white mb-2">
            Bem-vindo à nova My Way Business!
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            Notamos que você já era nosso cliente. Para sua segurança, defina uma nova senha e
            confirme seus dados abaixo.
          </p>

          {error && (
            <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white border-b border-zinc-800 pb-2">
                Segurança
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>
                    Nova Senha <span className="text-red-500">*</span>
                  </Label>
                  <Field
                    icon={Lock}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    required
                    value={password}
                    onChange={(e: any) => setPassword(e.target.value)}
                    disabled={loading}
                    right={
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="text-zinc-500 hover:text-white"
                        disabled={loading}
                      >
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>
                    Confirmar Senha <span className="text-red-500">*</span>
                  </Label>
                  <Field
                    icon={Lock}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Confirme sua nova senha"
                    required
                    value={confirmPassword}
                    onChange={(e: any) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white border-b border-zinc-800 pb-2">
                Dados Pessoais
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>
                    Nome Completo <span className="text-red-500">*</span>
                  </Label>
                  <Field
                    icon={User}
                    placeholder="Seu nome completo"
                    required
                    value={fullName}
                    onChange={(e: any) => setFullName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>
                      Telefone <span className="text-red-500">*</span>
                    </Label>
                    <Field
                      icon={Phone}
                      placeholder="Seu telefone"
                      required
                      value={phone}
                      onChange={(e: any) => setPhone(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>CPF/CNPJ (Opcional)</Label>
                    <Field
                      icon={FileText}
                      placeholder="Apenas números"
                      value={cpf}
                      onChange={(e: any) => setCpf(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white border-b border-zinc-800 pb-2">
                Endereço
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>
                    CEP <span className="text-red-500">*</span>
                  </Label>
                  <Field
                    icon={MapPin}
                    placeholder="Seu CEP"
                    required
                    value={zipCode}
                    onChange={(e: any) => setZipCode(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>
                    Logradouro / Rua <span className="text-red-500">*</span>
                  </Label>
                  <Field
                    placeholder="Nome da rua"
                    required
                    value={street}
                    onChange={(e: any) => setStreet(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1">
                  <Label>
                    Bairro <span className="text-red-500">*</span>
                  </Label>
                  <Field
                    placeholder="Seu bairro"
                    required
                    value={neighborhood}
                    onChange={(e: any) => setNeighborhood(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1">
                  <Label>
                    Cidade <span className="text-red-500">*</span>
                  </Label>
                  <Field
                    placeholder="Sua cidade"
                    required
                    value={city}
                    onChange={(e: any) => setCity(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1">
                  <Label>
                    Estado <span className="text-red-500">*</span>
                  </Label>
                  <Field
                    placeholder="Seu estado (UF)"
                    required
                    value={state}
                    onChange={(e: any) => setState(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={
                loading ||
                !password ||
                !confirmPassword ||
                !fullName ||
                !phone ||
                !zipCode ||
                !street ||
                !neighborhood ||
                !city ||
                !state
              }
              className="w-full bg-[#FF6600] hover:bg-[#FF6600]/90 text-white h-11 rounded-xl mt-6 transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sincronizando dados...
                </div>
              ) : (
                'Ativar Conta'
              )}
            </Button>

            <div className="text-center mt-4">
              <Link
                to="/login"
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Cancelar e voltar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
