import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import logoImg from '../assets/mw_logo_horiz_1200x318_fundo_escuro-037e3.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signIn(email, password)

    if (error) {
      setError('Email ou senha inválidos. Por favor, tente novamente.')
      setLoading(false)
    } else {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[400px] z-10 animate-fade-in-up">
        {/* Logo Section */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="inline-block transition-transform hover:scale-105 duration-300">
            <img
              src={logoImg}
              alt="My Way Video"
              className="w-[180px] sm:w-[220px] object-contain"
            />
          </Link>
        </div>

        {/* Form Container */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle top border highlight */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50" />

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-white mb-2 tracking-tight">
              Entrar na Sua Conta
            </h1>
            <p className="text-sm text-zinc-400">Acesse sua conta para continuar.</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start animate-fade-in">
              <span className="text-sm text-red-500">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 relative">
              <Label htmlFor="email" className="text-zinc-300 font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500 focus-visible:border-orange-500 focus-visible:ring-offset-0 h-12 rounded-xl transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-300 font-medium">
                  Senha
                </Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500 focus-visible:border-orange-500 focus-visible:ring-offset-0 h-12 rounded-xl transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 pb-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  className="border-zinc-700 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 rounded text-black"
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                >
                  Lembrar-me
                </label>
              </div>

              <Link
                to="/forgot-password"
                className="text-sm text-orange-500 hover:text-orange-400 font-medium transition-colors"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF6600] hover:bg-[#FF6600]/90 text-white font-semibold h-12 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/20"
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-950 px-2 text-zinc-500">Ou</span>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-400">
              Não tem uma conta?{' '}
              <Link
                to="/register"
                className="text-orange-500 hover:text-orange-400 font-medium transition-colors"
              >
                Criar uma agora
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
