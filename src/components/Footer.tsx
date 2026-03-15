import { Link } from 'react-router-dom'
import { Video } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background pt-16 pb-8 mt-auto text-center md:text-left">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-4 max-w-md">
          <Link to="/" className="flex items-center justify-center md:justify-start gap-2">
            <Video className="w-6 h-6 text-accent" />
            <span className="font-bold text-xl uppercase">My Way Video</span>
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sobre a My Way Video: Equipamentos audiovisuais de alta performance para produções
            cinematográficas e broadcast.
          </p>
        </div>
        <div className="text-sm text-muted-foreground text-center md:text-right space-y-2">
          <p>Address: 1735 NW 79th Av., Doral, FL 33126</p>
          <p>Phone/WhatsApp: +1-786-716-1170</p>
        </div>
      </div>
    </footer>
  )
}
