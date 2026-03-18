import { MessageCircle } from 'lucide-react'

export function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/17867161170"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 p-4 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-full shadow-lg shadow-[#25D366]/30 transition-all hover:scale-110 hover:shadow-xl flex items-center justify-center animate-fade-in-up"
      aria-label="Contato via WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
    </a>
  )
}
