import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { WhatsAppButton } from './WhatsAppButton'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  )
}
