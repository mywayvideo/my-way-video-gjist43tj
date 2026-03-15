import { Link } from 'react-router-dom'
import { Facebook, Instagram, Twitter, Youtube, MapPin, Phone, Mail } from 'lucide-react'
import logoUrl from '@/assets/mw_logo_horiz_1200x318_fundo_escuro-a5934.png'

export function Footer() {
  return (
    <footer className="bg-muted/30 border-t mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between gap-12">
          <div className="md:w-1/2 max-w-sm">
            <Link to="/" className="flex items-center space-x-2 mb-6">
              <img src={logoUrl} alt="My Way Video" className="h-8 md:h-10 w-auto" />
            </Link>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Seu parceiro definitivo em equipamentos de audiovisual profissional. Qualidade,
              garantia e suporte técnico especializado.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="bg-background border border-border p-2 rounded-full text-muted-foreground hover:text-primary hover:border-primary transition-all"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="bg-background border border-border p-2 rounded-full text-muted-foreground hover:text-primary hover:border-primary transition-all"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="bg-background border border-border p-2 rounded-full text-muted-foreground hover:text-primary hover:border-primary transition-all"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="bg-background border border-border p-2 rounded-full text-muted-foreground hover:text-primary hover:border-primary transition-all"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="md:w-1/2 max-w-sm md:text-right flex flex-col md:items-end">
            <h3 className="font-semibold text-lg mb-6 text-foreground">Informações de Contato</h3>
            <ul className="space-y-4 text-sm w-full">
              <li className="flex items-start md:justify-end gap-4 text-muted-foreground group">
                <span className="pt-1 leading-relaxed text-left md:text-right">
                  1735 NW 79th Av., Doral, FL 33126
                </span>
                <div className="bg-primary/10 p-2 rounded-full text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
              </li>
              <li className="flex items-center md:justify-end gap-4 text-muted-foreground group">
                <span className="font-medium tracking-wide">+1-786-716-1170</span>
                <div className="bg-primary/10 p-2 rounded-full text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
              </li>
              <li className="flex items-center md:justify-end gap-4 text-muted-foreground group">
                <span>sales@mywayvideo.com</span>
                <div className="bg-primary/10 p-2 rounded-full text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-12 pt-8 text-center text-muted-foreground text-sm flex flex-col md:flex-row justify-between items-center">
          <p>&copy; {new Date().getFullYear()} My Way Video. Todos os direitos reservados.</p>
          <div className="mt-4 md:mt-0 space-x-6 font-medium">
            <Link to="/terms" className="hover:text-primary transition-colors">
              Termos de Uso
            </Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">
              Privacidade
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
