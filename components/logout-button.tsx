'use client'

import { useRouter } from 'next/navigation'

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
    <div className="pt-2">
      <Button onClick={logout} className="w-full bg-transparent border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white py-2 rounded-lg transition-all text-sm">Cerrar sesión</Button>
    </div>
  )
}
