import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from './components/Layout'
import Index from './pages/Index'
import Search from './pages/Search'
import Product from './pages/Product'
import Admin from './pages/Admin'
import AdminAIProviders from './pages/AdminAIProviders'
import AdminProductCache from './pages/AdminProductCache'
import AdminAISettings from './pages/AdminAISettings'
import AdminAISystemPrompt from './pages/AdminAISystemPrompt'
import AdminAIPage from './pages/admin/AdminAIPage'
import AdminCatalogPage from './pages/admin/AdminCatalogPage'
import AdminPricingPage from './pages/admin/AdminPricingPage'
import NewProductPage from './pages/admin/NewProductPage'
import SettingsPage from './pages/admin/SettingsPage'
import ShippingConfigPage from './pages/admin/ShippingConfigPage'
import Dashboard from './pages/Dashboard'
import DashboardAdmin from './pages/DashboardAdmin'
import AdminDiscountsPage from './pages/admin/AdminDiscountsPage'
import AssistedCheckoutPage from './pages/admin/AssistedCheckoutPage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import NotFound from './pages/NotFound'
import Favorites from './pages/Favorites'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import CheckoutSuccess from './pages/CheckoutSuccess'
import { AuthProvider } from '@/hooks/use-auth'
import { UserProvider } from '@/contexts/UserContext'
import { CartProvider } from '@/hooks/useCart'

const App = () => {
  return (
    <AuthProvider>
      <UserProvider>
        <CartProvider>
          <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/product/:id" element={<Product />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/admin/ai" element={<AdminAIPage />} />
                  <Route path="/admin/catalog" element={<AdminCatalogPage />} />
                  <Route path="/products/new" element={<NewProductPage />} />
                  <Route path="/products/edit/:id" element={<NewProductPage />} />
                  <Route path="/admin/pricing" element={<AdminPricingPage />} />
                  <Route path="/admin/ai-providers" element={<AdminAIProviders />} />
                  <Route path="/admin/product-cache" element={<AdminProductCache />} />
                  <Route path="/admin/ai-settings" element={<AdminAISettings />} />
                  <Route path="/admin/ai-system-prompt" element={<AdminAISystemPrompt />} />
                  <Route path="/admin/settings" element={<SettingsPage />} />
                  <Route path="/admin/shipping-config" element={<ShippingConfigPage />} />
                  <Route path="/admin/discounts" element={<AdminDiscountsPage />} />
                  <Route
                    path="/admin/checkout-assistido/:customerId"
                    element={<AssistedCheckoutPage />}
                  />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/dashboard-admin" element={<DashboardAdmin />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/checkout/success" element={<CheckoutSuccess />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </BrowserRouter>
        </CartProvider>
      </UserProvider>
    </AuthProvider>
  )
}

export default App
