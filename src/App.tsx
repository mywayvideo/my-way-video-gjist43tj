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
import AdminDiscountsPage from './pages/admin/AdminDiscountsPage'
import AdminCustomersPage from './pages/admin/AdminCustomersPage'
import AdminMetricsPage from './pages/admin/AdminMetricsPage'
import AdminProfilePage from './pages/admin/AdminProfilePage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AssistedCheckoutPage from './pages/admin/AssistedCheckoutPage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import NotFound from './pages/NotFound'
import Favorites from './pages/Favorites'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import CheckoutSuccess from './pages/CheckoutSuccess'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/hooks/useCart'

const App = () => {
  return (
    <AuthProvider>
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
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/ai"
                  element={
                    <ProtectedRoute>
                      <AdminAIPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/catalog"
                  element={
                    <ProtectedRoute>
                      <AdminCatalogPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/products/new"
                  element={
                    <ProtectedRoute>
                      <NewProductPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/products/edit/:id"
                  element={
                    <ProtectedRoute>
                      <NewProductPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/pricing"
                  element={
                    <ProtectedRoute>
                      <AdminPricingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/ai-providers"
                  element={
                    <ProtectedRoute>
                      <AdminAIProviders />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/product-cache"
                  element={
                    <ProtectedRoute>
                      <AdminProductCache />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/ai-settings"
                  element={
                    <ProtectedRoute>
                      <AdminAISettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/ai-system-prompt"
                  element={
                    <ProtectedRoute>
                      <AdminAISystemPrompt />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/shipping-config"
                  element={
                    <ProtectedRoute>
                      <ShippingConfigPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/discounts"
                  element={
                    <ProtectedRoute>
                      <AdminDiscountsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/orders"
                  element={
                    <ProtectedRoute>
                      <AdminOrdersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/checkout-assistido/:customerId"
                  element={
                    <ProtectedRoute>
                      <AssistedCheckoutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/customers"
                  element={
                    <ProtectedRoute>
                      <AdminCustomersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/metrics"
                  element={
                    <ProtectedRoute>
                      <AdminMetricsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/profile"
                  element={
                    <ProtectedRoute>
                      <AdminProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/checkout/success" element={<Checkou