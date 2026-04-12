import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export const config = {
  matcher: [
    /*
     * Protegemos todas las rutas de la app (API y páginas), excepto
     * los assets estáticos y los ficheros de Next.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

export function middleware(request: NextRequest) {
  return updateSession(request)
}
