'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <Button
      onClick={logout}
      variant="outline"
      className="fixed bottom-8 left-8 w-14 h-14 bg-white text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-20 border-none"
      title="Cerrar sesión"
    >
      <LogOut className="w-6 h-6" strokeWidth={2.5} />
    </Button>
  )
}