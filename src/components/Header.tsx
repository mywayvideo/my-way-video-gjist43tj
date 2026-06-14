import { Link } from 'react-router-dom'
import { DirectSearch } from '@/components/DirectSearch'
import { ShoppingCart, User, Heart, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import mwLogo from '../assets/mwlogohorizv03smalldarkback-c68bc.png'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthContext } from '@/contexts/AuthContext'

export function Header() {
  const { user } = useAuthContext()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function checkRole() {
      if (!user) {
        setIsAdmin(false)
        return
      }

      const { data } = await supabase
        .from('customers')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (data && data.role === 'admin') {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    }

    checkRole()
  }, [user])
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3 md:py-0 min-h-16 h-auto md:h-16 flex flex-wrap md:flex-nowrap items-center justify-between gap-y-3 gap-x-4">
        <Link to="/" className="flex items-center shrink-0 order-1">
          <img
            src={mwLogo}
            alt="My Way Video"
            className="h-10 sm:h-12 w-auto object-contain"
            loading="eager"
          />
        </Link>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0 order-2 md:order-3">
          {isAdmin && (
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin/dashboard">
                <Settings className="w-5 h-5" />
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
            <Link to="/favorites">
              <Heart className="w-5 h-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/cart">
              <ShoppingCart className="w-5 h-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/login">
              <User className="w-5 h-5" />
            </Link>
          </Button>
        </div>

        <div className="order-3 md:order-2 w-full md:w-auto md:flex-1 flex justify-center md:max-w-2xl px-0 md:px-4">
          <DirectSearch />
        </div>
      </div>
    </header>
  )
}
