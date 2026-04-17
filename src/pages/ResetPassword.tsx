import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import logoImg from '../assets/mw_logo_horiz_1200x318_fundo_escuro-037e3.png'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    // Optionally we can verify if there is an active session
    // since Supabase handles the token in the URL automatically and creates a session
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        console.warn('No active session found. The password reset might fail.')
      }
    }
    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem.',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter no mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Senha atualizada com sucesso!',
      })

      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar a senha. O link pode ter expirado.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center p-4 relative overflow-hidden pt-12 pb-12">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="w-full max-w-[400px] z-10 animate-fade-in-up">
        <div className="flex justify-center mb-6">
          <img src={logoImg} alt="Logo" className="w-[180px] object-contain" />
        </div>

        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 relative">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white mb-2">Redefinir Senha</h1>
            <p className="text-sm text-zinc-400">Digite sua nova senha abaixo.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-white">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="bg-zinc-900 border-zinc-800 text-white h-11 rounded-xl text-sm pl-9 pr-9 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  disabled={loading}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-white">Confirmar Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Confirme a senha"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="bg-zinc-900 border-zinc-800 text-white h-11 rounded-xl text-sm pl-9 pr-9 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-[#FF6600] hover:bg-[#FF6600]/90 text-white h-11 rounded-xl mt-6"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Atualizar Senha'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
