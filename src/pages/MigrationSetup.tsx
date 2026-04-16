import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
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
  const email = searchParams.get('email')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nav = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return setError('Email inválido ou não fornecido.')
    if (password.length < 8) return setError('A senha deve ter no mínimo 8 caracteres.')
    if (password !== confirmPassword) return setError('As senhas não coincidem.')

    setLoading(true)
    setError(null)

    try {
      // Calling signUp will create the auth user and fire the updated trigger
      // which automatically binds to the existing legacy record and updates status
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) throw signUpError

      toast({
        title: 'Senha cadastrada com sucesso!',
        description: 'Bem-vindo ao novo sistema da My Way.',
      })

      // Redirect to home/dashboard - user might be already logged in if email confirmation is disabled
      nav('/', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Erro ao definir senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-black flex flex-col justify-center items-center p-4">
        <div className="text-red-500 mb-4">Link inválido. Retorne ao login.</div>
        <Link to="/login">
          <Button variant="outline" className="text-white border-zinc-800 hover:bg-zinc-800">
            Voltar ao Login
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center p-4 relative overflow-hidden pt-12 pb-12">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="w-full max-w-[400px] z-10 animate-fade-in-up">
        <div className="flex justify-center mb-6">
          <Link to="/" className="hover:scale-105 transition-transform">
            <img src={logoImg} alt="Logo" className="w-[180px] object-contain" />
          </Link>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 relative">
          <h2 className="text-xl font-medium text-white mb-2">Atualize sua Conta</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Defina uma senha segura para acessar o novo ambiente com o email:
            <strong className="block mt-1 text-zinc-300">{email}</strong>
          </p>

          {error && (
            <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <Button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-[#FF6600] hover:bg-[#FF6600]/90 text-white h-11 rounded-xl mt-6"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Definir Nova Senha'}
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
