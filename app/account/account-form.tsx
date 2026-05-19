'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Avatar from './avatar'
import { LogoutButton } from '@/components/logout-button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Claims = { sub: string; email?: string; [key: string]: unknown }

export default function AccountForm({ claims }: { claims: Claims | null }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [fullname, setFullname] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [website, setWebsite] = useState<string | null>(null)
  const [avatar_url, setAvatarUrl] = useState<string | null>(null)

  const getProfile = useCallback(async () => {
    try {
      if (!claims?.sub) {
        setLoading(false)
        return
      }
      setLoading(true)
      const { data, error, status } = await supabase
        .from('profiles')
        .select(`full_name, username, website, avatar_url`)
        .eq('id', claims.sub)
        .single()

      if (error && status !== 406) throw error

      if (data) {
        setFullname(data.full_name)
        setUsername(data.username)
        setWebsite(data.website)
        setAvatarUrl(data.avatar_url)
      }
    } catch (error) {
      console.error('Error loading user data!', error)
    } finally {
      setLoading(false)
    }
  }, [claims, supabase])

  useEffect(() => {
    getProfile()
  }, [claims, getProfile])

  async function updateProfile({
    username,
    website,
    avatar_url,
  }: {
    username: string | null
    fullname: string | null
    website: string | null
    avatar_url: string | null
  }) {
    try {
      if (!claims?.sub) return
      setLoading(true)
      const { error } = await supabase.from('profiles').upsert({
        id: claims.sub,
        full_name: fullname,
        username,
        website,
        avatar_url,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      alert('¡Perfil actualizado!')
    } catch (error) {
      alert('¡Error al actualizar los datos!')
    } finally {
      setLoading(false)
    }
  }

  // Clases reutilizables para los inputs
  const inputStyles = "w-full bg-[#121212] border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
  const labelStyles = "block mb-1.5 text-sm font-semibold text-zinc-400"

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0a0a0a] text-white">
      
      {/* HEADER: Integrado en el contenedor principal */}
      <div className="p-4 sm:p-6 pb-0 w-full max-w-md mx-auto flex justify-start">
        <Link
          href="/spending-groups"
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
      </div>

      {/* CONTENIDO: Centrado en el espacio restante */}
      <div className="flex-1 w-full flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#171717] rounded-3xl border border-white/5 p-6 sm:p-8 shadow-2xl relative">
          
          <h1 className="text-2xl font-bold mb-6 text-white">Perfil</h1>
          
          <div className="flex flex-col items-center mb-8">
            <Avatar
              uid={claims?.sub ?? null}
              url={avatar_url}
              size={100}
              onUpload={(url) => {
                setAvatarUrl(url)
                updateProfile({ fullname, username, website, avatar_url: url })
              }}
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelStyles} htmlFor="email">Email</label>
              <input id="email" type="text" className={inputStyles} value={claims?.email ?? ''} disabled />
            </div>

            <div>
              <label className={labelStyles} htmlFor="fullName">Nombre Completo</label>
              <input
                id="fullName"
                type="text"
                className={inputStyles}
                placeholder="Tu nombre"
                value={fullname || ''}
                onChange={(e) => setFullname(e.target.value)}
              />
            </div>

            <div>
              <label className={labelStyles} htmlFor="username">Usuario</label>
              <input
                id="username"
                type="text"
                className={inputStyles}
                placeholder="Nombre de usuario"
                value={username || ''}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className={labelStyles} htmlFor="website">Sitio Web</label>
              <input
                id="website"
                type="url"
                className={inputStyles}
                placeholder="https://ejemplo.com"
                value={website || ''}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="pt-4">
              <button
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-colors disabled:bg-blue-600/50 disabled:text-white/50 active:scale-[0.98]"
                onClick={() => updateProfile({ fullname, username, website, avatar_url })}
                disabled={loading || !claims?.sub}
              >
                {loading ? 'Guardando...' : 'Actualizar Datos'}
              </button>
            </div>
            
            {/* Contenedor limpio para el Logout */}
            <div className="pt-6 mt-4 border-t border-white/5 flex justify-center">
              <LogoutButton />
            </div>
            
          </div>
        </div>
      </div>
    </div>
  )
}