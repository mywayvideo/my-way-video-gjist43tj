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
        className:
          'bg-destructive text-white text-sm fixed bottom-4 right-4 m-4 animate-in slide-in-from-bottom-2 duration-300 ease-out border-0',
      })
      setLoading(false)
    } else {
      toast({
        title: 'Sucesso',
        description: AUTH_MESSAGES.WELCOME,
        className:
          'bg-green-600 text-white text-sm fixed bottom-4 right-4 m-4 animate-in slide-in-from-bottom-2 duration-300 ease-out border-0',
      })
      setSuccess(true)
      setTimeout(() => {
        setLoading(false)
        navigate('/dashboard')
      }, 1000)
    }
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh] px-4 py-8 animate-fade-in bg-gradient-to-br from-primary/10 to-secondary/10">
      <Card
        className={cn(
          'w-full max-w-full sm:max-w-md p-4 sm:p-6 bg-white dark:bg-card border-border rounded-xl shadow-lg transition-opacity duration-500 mx-auto',
          success ? 'opacity-0' : 'opacity-100',
        )}
      >
        <CardHeader className="space-y-3 items-center text-center px-0 pt-0">
          <div className="bg-primary/10 text-primary p-3 rounded-xl mb-2">
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
          <div className="px-0 pb-2">
            <TabsList className="flex w-full gap-4 border-b-2 border-border bg-transparent p-0 rounded-none h-auto">
              <TabsTrigger
                value="login"
                className="flex-1 p-3 font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none bg-transparent data-[state=active]:shadow-none data-[state=active]:bg-transparent"
              >
                {AUTH_MESSAGES.LOGIN_TAB}
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="flex-1 p-3 font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none bg-transparent data-[state=active]:shadow-none data-[state=active]:bg-transparent"
              >
                {AUTH_MESSAGES.SIGNUP_TAB}
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-0">
            <TabsContent
              value="login"
              className="m-0 p-6 animate-in fade-in duration-300 focus-visible:outline-none"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label
                    htmlFor="email-login"
                    className="font-semibold text-foreground mb-2 block text-sm"
                  >
                    {AUTH_MESSAGES.EMAIL_LABEL}
                  </Label>
                  <Input
                    id="email-login"
                    type="email"
                    disabled={loading}
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className={cn(
                      'border-input rounded-lg p-3 h-11 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none placeholder:text-muted-foreground',
                      errors.email && 'border-destructive focus-visible:ring-destructive',
                    )}
                  />
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="password-login"
                    className="font-semibold text-foreground mb-2 block text-sm"
                  >
                    {AUTH_MESSAGES.PASSWORD_LABEL}
                  </Label>
                  <Input
                    id="password-login"
                    type="password"
                    disabled={loading}
                    placeholder="********"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className={cn(
                      'border-input rounded-lg p-3 h-11 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none placeholder:text-muted-foreground',
                      errors.password && 'border-destructive focus-visible:ring-destructive',
                    )}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive mt-1">{errors.password}</p>
                  )}
                </div>

                {globalError && activeTab === 'login' && (
                  <div className="p-3 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-md mt-2">
                    {globalError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 mt-6 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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

              <div className="mt-6 flex flex-col gap-3 text-center">
                <a href="#" className="text-primary hover:underline text-sm transition-colors">
                  {AUTH_MESSAGES.FORGOT_PASSWORD}
                </a>
                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className="text-primary hover:underline text-sm transition-colors"
                  disabled={loading}
                >
                  {AUTH_MESSAGES.NO_ACCOUNT}
                </button>
              </div>
            </TabsContent>

            <TabsContent
              value="signup"
              className="m-0 p-6 animate-in fade-in duration-300 focus-visible:outline-none"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label
                    htmlFor="full_name"
                    className="font-semibold text-foreground mb-2 block text-sm"
                  >
                    {AUTH_MESSAGES.FULL_NAME_LABEL}
                  </Label>
                  <Input
                    id="full_name"
                    type="text"
                    disabled={loading}
                    placeholder="Seu nome"
                    value={formData.full_name}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    className={cn(
                      'border-input rounded-lg p-3 h-11 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none placeholder:text-muted-foreground',
                      errors.full_name && 'border-destructive focus-visible:ring-destructive',
                    )}
                  />
                  {errors.full_name && (
                    <p className="text-sm text-destructive mt-1">{errors.full_name}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="email-signup"
                    className="font-semibold text-foreground mb-2 block text-sm"
                  >
                    {AUTH_MESSAGES.EMAIL_LABEL}
                  </Label>
                  <Input
                    id="email-signup"
                    type="email"
                    disabled={loading}
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className={cn(
                      'border-input rounded-lg p-3 h-11 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none placeholder:text-muted-foreground',
                      errors.email && 'border-destructive focus-visible:ring-destructive',
                    )}
                  />
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="password-signup"
                    className="font-semibold text-foreground mb-2 block text-sm"
                  >
                    {AUTH_MESSAGES.PASSWORD_LABEL}
                  </Label>
                  <Input
                    id="password-signup"
                    type="password"
                    disabled={loading}
                    placeholder="********"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className={cn(
                      'border-input rounded-lg p-3 h-11 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none placeholder:text-muted-foreground',
                      errors.password && 'border-destructive focus-visible:ring-destructive',
                    )}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive mt-1">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="confirm_password"
                    className="font-semibold text-foreground mb-2 block text-sm"
                  >
                    {AUTH_MESSAGES.CONFIRM_PASSWORD_LABEL}
                  </Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    disabled={loading}
                    placeholder="********"
                    value={formData.confirm_password}
                    onChange={(e) => updateField('confirm_password', e.target.value)}
                    className={cn(
                      'border-input rounded-lg p-3 h-11 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none placeholder:text-muted-foreground',
                      errors.confirm_password &&
                        'border-destructive focus-visible:ring-destructive',
                    )}
                  />
                  {errors.confirm_password && (
                    <p className="text-sm text-destructive mt-1">{errors.confirm_password}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="accept_terms"
                    checked={formData.accept_terms}
                    disabled={loading}
                    onCheckedChange={(checked) => updateField('accept_terms', checked === true)}
                    className="h-5 w-5 border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="accept_terms" className="text-sm font-normal ml-2">
                    {AUTH_MESSAGES.TERMS_LABEL}
                  </Label>
                </div>
                {errors.accept_terms && (
                  <p className="text-sm text-destructive mt-1">{errors.accept_terms}</p>
                )}

                {globalError && activeTab === 'signup' && (
                  <div className="p-3 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-md mt-2">
                    {globalError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 mt-6 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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

              <div className="mt-6 flex flex-col gap-3 text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="text-primary hover:underline text-sm transition-colors"
                  disabled={loading}
                >
                  {AUTH_MESSAGES.HAS_ACCOUNT}
                </button>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  )
}
