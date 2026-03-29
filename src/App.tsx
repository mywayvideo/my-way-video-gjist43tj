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
import SettingsPage from './pages/admin/SettingsPage'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Signup from './pages/Signup'
import NotFound from './pages/NotFound'
import { AuthProvider } from '@/hooks/use-auth'

const App = () => (
  <AuthProvider>
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
            <Route path="/admin/ai-providers" element={<AdminAIProviders />} />
            <Route path="/admin/product-cache" element={<AdminProductCache />} />
            <Route path="/admin/ai-settings" element={<AdminAISettings />} />
            <Route path="/admin/ai-system-prompt" element={<AdminAISystemPrompt />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AuthProvider>
)

export default App
