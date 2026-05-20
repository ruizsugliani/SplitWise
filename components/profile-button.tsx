'use client'

import { useRouter } from 'next/navigation'
import { User } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ProfileButton() {
  const router = useRouter()

  const goToProfile = () => {
    router.push('/account')
  }

  return (
    <Button
      onClick={goToProfile}
      variant="outline"
      className="fixed bottom-8 left-22.5 w-14 h-14 bg-zinc-900/80 backdrop-blur-md border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
      title="Cerrar sesión"
    >
      <User className="w-6 h-6" strokeWidth={2.5} />
    </Button>
  )
}