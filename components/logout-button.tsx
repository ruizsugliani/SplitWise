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
      className="fixed bottom-8 left-6 w-14 h-14 bg-zinc-900/80 backdrop-blur-md border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
      title="Cerrar sesión"
    >
      <LogOut className="w-6 h-6" strokeWidth={2.5} />
    </Button>
  )
}