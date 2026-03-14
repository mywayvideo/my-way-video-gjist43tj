import { Link } from 'react-router-dom'
import { Video, Mail, Phone, MapPin } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background pt-16 pb-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <Video className="w-6 h-6 text-accent" />
              <span className="font-bold text-xl uppercase">My Way Video</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Equipamentos audiovisuais de alta performance para produções cinematográficas e
              broadcast.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Catálogo</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/search?q=cameras" className="hover:text-accent transition-colors">
                  Câmeras
                </Link>
              </li>
              <li>
                <Link to="/search?q=lentes" className="hover:text-accent transition-colors">
                  Lentes
                </Link>
              </li>
              <li>
                <Link to="/search?q=iluminacao" className="hover:text-accent transition-colors">
                  Iluminação
                </Link>
              </li>
              <li>
                <Link to="/search?q=audio" className="hover:text-accent transition-colors">
                  Áudio PRO
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Suporte</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-accent transition-colors">
                  Garantia PRO
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-accent transition-colors">
                  Assistência Técnica
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-accent transition-colors">
                  Prazos de Entrega
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-accent transition-colors">
                  Termos de Uso
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Contato</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" /> (11) 9999-0000
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> pro@mywayvideo.com
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" /> São Paulo, SP
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-muted-foreground/60">
          <p>© {new Date().getFullYear()} My Way Video. Todos os direitos reservados.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <span>Pagamento Seguro</span>
            <span>Entrega Expressa</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
