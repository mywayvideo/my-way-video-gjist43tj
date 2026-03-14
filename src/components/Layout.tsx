import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { CartProvider } from '@/stores/useCartStore'

export default function Layout() {
  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-accent/30 font-sans">
        <Header />
        <main className="flex-1 flex flex-col w-full animate-fade-in">
          <Outlet />
        </main>
        <Footer />
      </div>
    </CartProvider>
  )
}
