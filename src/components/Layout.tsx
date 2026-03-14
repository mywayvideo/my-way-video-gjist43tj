import { Outlet, Link, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { CartProvider } from '@/stores/useCartStore'
import { Settings } from 'lucide-react'

export default function Layout() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-accent/30 font-sans relative">
        {!isAdmin && <Header />}
        <main className="flex-1 flex flex-col w-full animate-fade-in">
          <Outlet />
        </main>
        {!isAdmin && <Footer />}

        {/* Floating Admin Button */}
        {!isAdmin && (
          <Link
            to="/admin"
            className="fixed bottom-6 right-6 p-4 bg-accent text-accent-foreground rounded-full shadow-elevation hover:scale-105 transition-all z-50 flex items-center justify-center group"
          >
            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
            <span className="sr-only">Admin Panel</span>
          </Link>
        )}
      </div>
    </CartProvider>
  )
}
