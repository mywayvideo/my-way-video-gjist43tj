import React, { createContext, useContext, useState, ReactNode } from 'react'
import { toast } from '@/hooks/use-toast'

export type UserRole = 'admin' | 'customer'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthStore {
  user: User | null
  login: (email: string, pass: string) => Promise<boolean>
  signup: (name: string, email: string, pass: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthStore | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = async (email: string, pass: string) => {
    if (!email || !pass) return false

    // Mock admin login
    if (email.includes('admin')) {
      setUser({ id: '1', name: 'Admin', email, role: 'admin' })
      toast({ title: 'Login realizado', description: 'Bem-vindo ao painel administrativo.' })
      return true
    }

    // Mock customer login
    setUser({ id: '2', name: 'Cliente', email, role: 'customer' })
    toast({ title: 'Login realizado', description: 'Bem-vindo de volta!' })
    return true
  }

  const signup = async (name: string, email: string, pass: string) => {
    if (!name || !email || !pass) return false

    setUser({ id: '3', name, email, role: 'customer' })
    toast({ title: 'Conta criada', description: 'Bem-vindo ao My Way Video.' })
    return true
  }

  const logout = () => {
    setUser(null)
    toast({ title: 'Logout', description: 'Você saiu da sua conta.' })
  }

  return React.createElement(
    AuthContext.Provider,
    { value: { user, login, signup, logout } },
    children,
  )
}

export function useAuthStore() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthStore must be used within an AuthProvider')
  }
  return context
}
