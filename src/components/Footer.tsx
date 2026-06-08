import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { MapPin, Phone, Mail } from 'lucide-react'

export function Footer() {
  const [aboutContent, setAboutContent] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFooterData() {
      try {
        const [companyInfoRes, appSettingsRes] = await Promise.all([
          supabase.from('company_info').select('content').eq('type', 'footer_about').maybeSingle(),
          supabase
            .from('app_settings')
            .select('setting_key, setting_value')
            .in('setting_key', ['company_address', 'company_phone', 'company_email']),
        ])

        if (companyInfoRes.data?.content) {
          setAboutContent(companyInfoRes.data.content)
        } else {
          setAboutContent(
            'Inteligência em Audiovisual PRO. As melhores soluções para o seu projeto.',
          )
        }

        if (appSettingsRes.data) {
          appSettingsRes.data.forEach((setting) => {
            if (setting.setting_key === 'company_address') setAddress(setting.setting_value)
            if (setting.setting_key === 'company_phone') setPhone(setting.setting_value)
            if (setting.setting_key === 'company_email') setEmail(setting.setting_value)
          })
        }
      } catch (error) {
        console.error('Error fetching footer data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFooterData()
  }, [])

  return (
    <footer className="mt-auto relative z-10 border-t border-border/10 bg-background/60 backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90 pointer-events-none" />

      <div className="container mx-auto px-6 py-16 md:py-20 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-12 lg:gap-24">
          {/* Brand & About */}
          <div className="space-y-6 md:col-span-1">
            <h3 className="text-xl md:text-2xl font-bold tracking-[0.2em] text-foreground uppercase">
              MY WAY VIDEO
            </h3>
            <div className="h-0.5 w-12 bg-primary/80 rounded-full" />
            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-muted/50 rounded w-3/4"></div>
                <div className="h-4 bg-muted/50 rounded w-full"></div>
                <div className="h-4 bg-muted/50 rounded w-5/6"></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/80 leading-relaxed font-light">
                {aboutContent}
              </p>
            )}
          </div>

          {/* Support */}
          <div className="space-y-6">
            <h4 className="text-sm font-semibold tracking-[0.15em] text-foreground uppercase">
              Suporte
            </h4>
            <div className="space-y-4 text-sm text-muted-foreground/80 font-light">
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-muted/50 rounded w-1/2"></div>
                  <div className="h-4 bg-muted/50 rounded w-2/3"></div>
                  <div className="h-4 bg-muted/50 rounded w-1/2"></div>
                </div>
              ) : (
                <>
                  {address && (
                    <div className="flex items-start gap-4 group cursor-default">
                      <MapPin className="w-4 h-4 mt-0.5 text-primary/60 group-hover:text-primary transition-colors shrink-0" />
                      <span className="leading-relaxed">{address}</span>
                    </div>
                  )}
                  {phone && (
                    <div className="flex items-center gap-4 group cursor-default">
                      <Phone className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors shrink-0" />
                      <span>{phone}</span>
                    </div>
                  )}
                  {email && (
                    <div className="flex items-center gap-4 group cursor-default">
                      <Mail className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors shrink-0" />
                      <span>{email}</span>
                    </div>
                  )}
                  {!address && !phone && !email && (
                    <p className="italic opacity-40">
                      Informações de contato indisponíveis no momento.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-6">
            <h4 className="text-sm font-semibold tracking-[0.15em] text-foreground uppercase">
              Legal
            </h4>
            <ul className="space-y-4 text-sm font-light">
              <li>
                <a
                  href="#"
                  className="text-muted-foreground/40 pointer-events-none flex items-center gap-3 transition-opacity"
                >
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground/40 pointer-events-none flex items-center gap-3 transition-opacity"
                >
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  Termos de Uso
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground/40 pointer-events-none flex items-center gap-3 transition-opacity"
                >
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  Privacidade
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-20 pt-8 border-t border-border/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[11px] text-muted-foreground/50 tracking-[0.2em] font-light uppercase">
            © {new Date().getFullYear()} MY WAY VIDEO. TODOS OS DIREITOS RESERVADOS.
          </p>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center opacity-50">
              <div className="w-1 h-1 rounded-full bg-primary/40" />
            </div>
            <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center opacity-50">
              <div className="w-1 h-1 rounded-full bg-primary/40" />
            </div>
            <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center opacity-50">
              <div className="w-1 h-1 rounded-full bg-primary/40" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
