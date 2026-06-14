import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { MapPin, Mail, Instagram, Facebook, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

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
  const [socialIg, setSocialIg] = useState('')
  const [socialFb, setSocialFb] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFooterData() {
      try {
        const [companyInfoRes, appSettingsRes] = await Promise.all([
          supabase.from('company_info').select('content').eq('type', 'footer_about').maybeSingle(),
          supabase
            .from('app_settings')
            .select('setting_key, setting_value')
            .in('setting_key', [
              'company_address',
              'company_whatsapp',
              'company_email',
              'social_instagram',
              'social_facebook',
            ]),
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
            if (setting.setting_key === 'social_instagram') setSocialIg(setting.setting_value)
            if (setting.setting_key === 'social_facebook') setSocialFb(setting.setting_value)
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

  const igLink = socialIg || 'https://www.instagram.com/mywayvideopro/'
  const fbLink = socialFb || 'https://www.facebook.com/MyWayVideoPro'

  return (
    <footer className="mt-auto relative z-10 border-t border-border/10 bg-black text-white pt-20 pb-8 overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-16 mb-24">
          {/* Brand & About */}
          <div className="max-w-md space-y-8">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold tracking-tight">
                Eleve o Nível do seu Audiovisual
              </h3>
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-3/4"></div>
                  <div className="h-4 bg-white/10 rounded w-full"></div>
                  <div className="h-4 bg-white/10 rounded w-5/6"></div>
                </div>
              ) : (
                <p className="text-zinc-400 font-light text-lg leading-relaxed">{aboutContent}</p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <a
                href={igLink}
                target="_blank"
                rel="noreferrer"
                className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all duration-300 hover:scale-105"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href={fbLink}
                target="_blank"
                rel="noreferrer"
                className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all duration-300 hover:scale-105"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
            </div>
          </div>

          {/* Links & Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24 w-full lg:w-auto">
            {/* Navigation */}
            <div className="space-y-8">
              <h4 className="text-xs font-bold tracking-[0.2em] text-zinc-500 uppercase">
                Navegação
              </h4>
              <nav className="flex flex-col gap-5">
                <Link
                  to="/"
                  className="text-zinc-300 hover:text-white transition-colors duration-300 flex items-center gap-2 group w-fit"
                >
                  Home
                  <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-2 translate-y-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300" />
                </Link>
                <Link
                  to="/search"
                  className="text-zinc-300 hover:text-white transition-colors duration-300 flex items-center gap-2 group w-fit"
                >
                  Catálogo
                  <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-2 translate-y-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300" />
                </Link>
                <Link
                  to="/favorites"
                  className="text-zinc-300 hover:text-white transition-colors duration-300 flex items-center gap-2 group w-fit"
                >
                  Favoritos
                  <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-2 translate-y-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300" />
                </Link>
              </nav>
            </div>

            {/* Contact */}
            <div className="space-y-8">
              <h4 className="text-xs font-bold tracking-[0.2em] text-zinc-500 uppercase">
                Contato
              </h4>
              <div className="space-y-5 text-zinc-300 font-light">
                {loading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-3/4"></div>
                    <div className="h-4 bg-white/10 rounded w-1/2"></div>
                    <div className="h-4 bg-white/10 rounded w-2/3"></div>
                  </div>
                ) : (
                  <>
                    {address && (
                      <div className="flex items-start gap-4 group cursor-default">
                        <MapPin className="w-5 h-5 text-white/40 group-hover:text-white transition-colors shrink-0 mt-0.5" />
                        <span className="leading-relaxed max-w-[250px]">{address}</span>
                      </div>
                    )}
                    {whatsapp && (
                      <div className="flex items-center gap-4 group cursor-default">
                        <WhatsAppIcon className="w-5 h-5 text-white/40 group-hover:text-white transition-colors shrink-0" />
                        <span>{whatsapp}</span>
                      </div>
                    )}
                    {email && (
                      <div className="flex items-center gap-4 group cursor-default">
                        <Mail className="w-5 h-5 text-white/40 group-hover:text-white transition-colors shrink-0" />
                        <span>{email}</span>
                      </div>
                    )}
                    {!address && !whatsapp && !email && (
                      <p className="italic text-zinc-600">Informações não disponíveis.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Massive Typography & Bottom Bar */}
      <div className="relative w-full border-t border-white/5 pt-12 mt-12 group cursor-default">
        <h2 className="text-[12vw] md:text-[14vw] font-black tracking-tighter leading-none text-center text-transparent bg-clip-text bg-gradient-to-b from-zinc-800 to-black select-none group-hover:from-zinc-700 group-hover:to-black transition-all duration-700 mx-4">
          MY WAY VIDEO
        </h2>

        <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-zinc-600 uppercase tracking-widest mix-blend-difference">
          <p>© {new Date().getFullYear()} My Way Video</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">
              Privacidade
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Termos
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
