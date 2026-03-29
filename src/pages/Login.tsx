import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Video, Loader2 } from 'lucide-react'
import { authService } from '@/services/authService'
import { useAuthForm } from '@/hooks/use-auth-form'
import { AUTH_MESSAGES } from '@/constants/auth'
import { cn } from '@/lib/utils'

export default function Login() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { formData, errors, updateField, isValid, mapAuthError, validate } = useAuthForm(activeTab)

  useEffect(() => {
    setGlobalError(null)
  }, [activeTab])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setGlobalError(null)

    let result
    if (activeTab === 'login') {
      result = await authService.login(formData.email, formData.password || '')
    } else {
      result = await authService.signup(
        formData.full_name || '',
        formData.email,
        formData.password || '',
      )
    }

    if (!result.success) {
      const mappedError = mapAuthError(result.error || '')
      setGlobalError(mappedError)
      toast({
        variant: 'destructive',
        title: 'Erro de autenticação',
        description: mappedError,
        action: (
          <ToastAction altText="Tentar novamente" onClick={() => handleSubmit()}>
            Tentar novamente
          </ToastAction>
        ),
      })
      setLoading(false)
    } else {
      toast({
        title: 'Sucesso',
        description: AUTH_MESSAGES.WELCOME,
      })
      setSuccess(true)
      setTimeout(() => {
        setLoading(false)
        navigate('/dashboard')
      }, 1000)
    }
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh] px-4 py-8 animate-fade-in">
      <Card
        className={cn(
          'w-full max-w-md bg-card/50 border-white/10 shadow-elevation backdrop-blur-sm transition-opacity duration-500',
          success ? 'opacity-0' : 'opacity-100',
        )}
      >
        <CardHeader className="space-y-3 items-center text-center">
          <div className="bg-accent text-accent-foreground p-3 rounded-xl mb-2">
            <Video className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Acesse sua conta</CardTitle>
          <CardDescription>Faça login ou crie uma nova conta para continuar.</CardDescription>
        </CardHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as 'login' | 'signup')}
          className="w-full"
        >
          <div className="px-6 pb-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{AUTH_MESSAGES.LOGIN_TAB}</TabsTrigger>
              <TabsTrigger value="signup">{AUTH_MESSAGES.SIGNUP_TAB}</TabsTrigger>
            </TabsList>
          </div>

          <CardContent>
            <TabsContent value="login" className="m-0 focus-visible:outline-none">
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-login">{AUTH_MESSAGES.EMAIL_LABEL}</Label>
                  <Input
                    id="email-login"
                    type="email"
                    disabled={loading}
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className={cn(
                      'bg-background/50 h-11 border-white/10 focus-visible:ring-accent',
                      errors.email && 'border-destructive focus-visible:ring-destructive',
                    )}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password-login">{AUTH_MESSAGES.PASSWORD_LABEL}</Label>
                  <Input
                    id="password-login"
                    type="password"
                    disabled={loading}
                    placeholder="********"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className={cn(
                      'bg-background/50 h-11 border-white/10 focus-visible:ring-accent',
                      errors.password && 'border-destructive focus-visible:ring-destructive',
                    )}
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                {globalError && activeTab === 'login' && (
                  <div className="p-3 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
                    {globalError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 mt-4 bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={loading || !isValid}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {AUTH_MESSAGES.PROCESS_LOADING}
                    </>
                  ) : (
                    AUTH_MESSAGES.SUBMIT_LOGIN
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="m-0 focus-visible:outline-none">
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">{AUTH_MESSAGES.FULL_NAME_LABEL}</Label>
                  <Input
                    id="full_name"
                    type="text"
                    disabled={loading}
                    placeholder="Seu nome"
                    value={formData.full_name}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    className={cn(
                      'bg-background/50 h-11 border-white/10 focus-visible:ring-accent',
                      errors.full_name && 'border-destructive focus-visible:ring-destructive',
                    )}
                  />
                  {errors.full_name && (
                    <p className="text-sm text-destructive">{errors.full_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-signup">{AUTH_MESSAGES.EMAIL_LABEL}</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    disabled={loading}
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className={cn(
                      'bg-background/50 h-11 border-white/10 focus-visible:ring-accent',
                      errors.email && 'border-destructive focus-visible:ring-destructive',
                    )}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password-signup">{AUTH_MESSAGES.PASSWORD_LABEL}</Label>
                  <Input
                    id="password-signup"
                    type="password"
                    disabled={loading}
                    placeholder="********"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className={cn(
                      'bg-background/50 h-11 border-white/10 focus-visible:ring-accent',
                      errors.password && 'border-destructive focus-visible:ring-destructive',
                    )}
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">{AUTH_MESSAGES.CONFIRM_PASSWORD_LABEL}</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    disabled={loading}
                    placeholder="********"
                    value={formData.confirm_password}
                    onChange={(e) => updateField('confirm_password', e.target.value)}
                    className={cn(
                      'bg-background/50 h-11 border-white/10 focus-visible:ring-accent',
                      errors.confirm_password &&
                        'border-destructive focus-visible:ring-destructive',
                    )}
                  />
                  {errors.confirm_password && (
                    <p className="text-sm text-destructive">{errors.confirm_password}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="accept_terms"
                    checked={formData.accept_terms}
                    disabled={loading}
                    onCheckedChange={(checked) => updateField('accept_terms', checked === true)}
                    className="h-5 w-5"
                  />
                  <Label htmlFor="accept_terms" className="text-sm font-normal">
                    {AUTH_MESSAGES.TERMS_LABEL}
                  </Label>
                </div>
                {errors.accept_terms && (
                  <p className="text-sm text-destructive">{errors.accept_terms}</p>
                )}

                {globalError && activeTab === 'signup' && (
                  <div className="p-3 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
                    {globalError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 mt-4 bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={loading || !isValid}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {AUTH_MESSAGES.PROCESS_LOADING}
                    </>
                  ) : (
                    AUTH_MESSAGES.SUBMIT_SIGNUP
                  )}
                </Button>
              </form>
            </TabsContent>

            <div className="mt-6 flex flex-col gap-3 text-center text-sm">
              {activeTab === 'login' && (
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {AUTH_MESSAGES.FORGOT_PASSWORD}
                </a>
              )}

              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'login' ? 'signup' : 'login')}
                className="text-accent hover:underline font-medium"
                disabled={loading}
              >
                {activeTab === 'login' ? AUTH_MESSAGES.NO_ACCOUNT : AUTH_MESSAGES.HAS_ACCOUNT}
              </button>
            </div>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  )
}
