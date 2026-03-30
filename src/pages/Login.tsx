import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Mail, Lock, Eye, EyeOff, Loader2, Video } from 'lucide-react'
import { authService } from '@/services/authService'
import { useAuthForm } from '@/hooks/use-auth-form'
import { AUTH_MESSAGES } from '@/constants/auth'
import { cn } from '@/lib/utils'

export default function Login() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const { formData, errors, updateField, isValid, mapAuthError, validate } = useAuthForm('login')

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setGlobalError(null)

    const result = await authService.login(formData.email, formData.password || '')

    if (!result.success) {
      const mappedError = mapAuthError(result.error || '')
      setGlobalError(mappedError)
      setLoading(false)
    } else {
      toast({
        title: 'Sucesso',
        description: AUTH_MESSAGES.WELCOME,
        className: 'bg-green-600 text-white border-0',
      })
      setTimeout(() => {
        setLoading(false)
        navigate('/dashboard')
      }, 1000)
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8 bg-background animate-in fade-in duration-300">
      <Link to="/" className="mb-8 hover:opacity-80 transition-opacity">
        <div className="w-[80px] md:w-[100px] lg:w-[120px] mx-auto text-primary flex items-center justify-center">
          <Video className="w-full h-full" />
        </div>
      </Link>

      <div className="w-full sm:max-w-[360px] lg:max-w-[400px] bg-white dark:bg-zinc-900 border border-transparent dark:border-zinc-800 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] p-6 md:p-8 lg:p-10 mx-auto animate-in slide-in-from-bottom-3 duration-500">
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold text-foreground mb-2">Entrar na Sua Conta</h1>
          <p className="text-[14px] font-normal text-muted-foreground">
            Acesse sua conta para continuar.
          </p>
        </div>

        {globalError && (
          <div className="bg-destructive/10 text-destructive dark:text-red-400 px-3 py-3 rounded-md text-[13px] mb-3 animate-in slide-in-from-left-3 duration-300">
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-muted-foreground dark:text-zinc-400" />
            </div>
            <input
              type="email"
              disabled={loading}
              placeholder="seu@email.com"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={cn(
                'w-full h-[44px] pl-10 pr-3 py-2 border rounded-lg text-sm bg-transparent',
                'focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10',
                'transition-all duration-200 text-foreground dark:border-zinc-700',
                errors.email
                  ? 'border-destructive focus:border-destructive focus:ring-destructive/10'
                  : 'border-border',
              )}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-muted-foreground dark:text-zinc-400" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              disabled={loading}
              placeholder="Sua senha"
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              className={cn(
                'w-full h-[44px] pl-10 pr-10 py-2 border rounded-lg text-sm bg-transparent',
                'focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10',
                'transition-all duration-200 text-foreground dark:border-zinc-700',
                errors.password
                  ? 'border-destructive focus:border-destructive focus:ring-destructive/10'
                  : 'border-border',
              )}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground dark:text-zinc-400 hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                className="h-4 w-4 border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label
                htmlFor="remember"
                className="text-[13px] text-foreground font-medium cursor-pointer"
              >
                Lembrar-me
              </label>
            </div>
            <a
              href="#"
              className="text-[13px] text-primary hover:text-yellow-600 dark:hover:text-yellow-500 font-medium transition-colors"
            >
              Esqueci minha senha
            </a>
          </div>

          <Button
            type="submit"
            disabled={loading || !isValid}
            className="w-full h-[44px] mt-6 bg-primary text-black font-semibold rounded-lg hover:scale-[1.02] hover:bg-yellow-500 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-[20px] w-[20px] animate-spin text-black" /> : 'Entrar'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/signup"
            className="text-[13px] text-muted-foreground hover:text-primary transition-colors"
          >
            Não tem conta?{' '}
            <span className="text-primary hover:text-yellow-600 dark:hover:text-yellow-500 font-medium">
              Criar uma agora.
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
