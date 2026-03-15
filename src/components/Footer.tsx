import { Link } from 'react-router-dom'
import { Facebook, Instagram, Twitter, Youtube, MapPin, Phone, Mail } from 'lucide-react'
import logoUrl from '@/assets/mw_logo_horiz_1200x318_fundo_escuro-a5934.png'

export function Footer() {
  return (
    <footer className="bg-muted/30 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-6">
              <img src={logoUrl} alt="My Way Video" className="h-8 md:h-10 w-auto" />
            </Link>
            <p className="text-muted-foreground mb-6 text-sm">
              Seu parceiro definitivo em equipamentos de audiovisual profissional. Qualidade,
              garantia e suporte especializado.
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

          <div>
            <h3 className="font-semibold text-lg mb-4">Links Rápidos</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                  Início
                </Link>
              </li>
              <li>
                <Link
                  to="/search"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Produtos e Busca IA
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Contato
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Categorias</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  to="/search?q=cameras"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Câmeras
                </Link>
              </li>
              <li>
                <Link
                  to="/search?q=lentes"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Lentes
                </Link>
              </li>
              <li>
                <Link
                  to="/search?q=iluminacao"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Iluminação
                </Link>
              </li>
              <li>
                <Link
                  to="/search?q=audio"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Áudio Profissional
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Contato</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="w-5 h-5 shrink-0 text-primary" />
                <span>Rua da Tecnologia, 1000 - Vila Olímpia, São Paulo - SP</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-5 h-5 shrink-0 text-primary" />
                <span>(11) 99999-9999</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Mail className="w-5 h-5 shrink-0 text-primary" />
                <span>contato@mywayvideo.com.br</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-12 pt-8 text-center text-muted-foreground text-sm flex flex-col md:flex-row justify-between items-center">
          <p>&copy; {new Date().getFullYear()} My Way Video. Todos os direitos reservados.</p>
          <div className="mt-4 md:mt-0 space-x-4">
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
