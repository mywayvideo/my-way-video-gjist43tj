import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { MapPin, Mail } from 'lucide-react'

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export function Footer() {
  const [aboutContent, setAboutContent] = useState('')
  const [address, setAddress] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
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
            .in('setting_key', ['company_address', 'company_whatsapp', 'company_email']),
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
            if (setting.setting_key === 'company_whatsapp') setWhatsapp(setting.setting_value)
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
          <div className="space-y-6 md:col-span-1 max-w-sm">
            <h3 className="text-xl md:text-2xl font-bold tracking-wide text-white uppercase">
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
              <p className="text-sm text-white leading-relaxed font-light">{aboutContent}</p>
            )}
          </div>

          {/* Contact */}
          <div className="space-y-6 md:col-span-1 md:mx-auto w-full md:w-auto">
            <h4 className="text-sm font-semibold tracking-wider text-white uppercase">Contato</h4>
            <div className="space-y-4 text-sm text-white font-light">
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
                      <MapPin className="w-4 h-4 mt-0.5 text-primary group-hover:text-primary/80 transition-colors shrink-0" />
                      <span className="leading-relaxed">{address}</span>
                    </div>
                  )}
                  {whatsapp && (
                    <div className="flex items-center gap-4 group cursor-default">
                      <WhatsAppIcon className="w-4 h-4 text-primary group-hover:text-primary/80 transition-colors shrink-0" />
                      <span>{whatsapp}</span>
                    </div>
                  )}
                  {email && (
                    <div className="flex items-center gap-4 group cursor-default">
                      <Mail className="w-4 h-4 text-primary group-hover:text-primary/80 transition-colors shrink-0" />
                      <span>{email}</span>
                    </div>
                  )}
                  {!address && !whatsapp && !email && (
                    <p className="italic opacity-40">
                      Informações de contato indisponíveis no momento.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-6 md:col-span-1 w-full md:w-auto">
            <h4 className="text-sm font-semibold tracking-wider text-white uppercase">Legal</h4>
            <ul className="space-y-4 text-sm font-light">
              <li>
                <a
                  href="#"
                  className="text-white pointer-events-none flex items-center gap-3 transition-opacity"
                >
                  <span className="w-1 h-1 rounded-full bg-white" />
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-white pointer-events-none flex items-center gap-3 transition-opacity"
                >
                  <span className="w-1 h-1 rounded-full bg-white" />
                  Termos de Uso
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-white pointer-events-none flex items-center gap-3 transition-opacity"
                >
                  <span className="w-1 h-1 rounded-full bg-white" />
                  Privacidade
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-20 pt-8 border-t border-border/10 flex justify-center text-center">
          <p className="text-sm text-white font-normal">
            © {new Date().getFullYear()} My Way Video, todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
