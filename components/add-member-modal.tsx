'use client'

import { useState } from 'react'
import { UserPlus, X, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AddMemberModalProps {
  groupId: string
}

function isPostgresError(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' && 
    error !== null && 
    'code' in error && 
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

export function AddMemberModal({ groupId }: AddMemberModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [memberName, setMemberName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  
  const router = useRouter()
  const supabase = createClient()

  const handleAddMember = async () => {
    if (!memberName.trim()) return
    setLoading(true)
    setErrorMsg("")

    try {
      let profileId = null;

      if (email.trim()) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.trim())
          .single()

        if (profileError || !profile) {
          setErrorMsg("No se encontró ninguna cuenta con este email.")
          setLoading(false)
          return 
        }
        
        profileId = profile.id
      }

      const { error } = await supabase
        .from('spending_group_members')
        .insert([{
          spending_group_id: groupId,
          member_name: memberName.trim(),
          profile_id: profileId,
        }])

      if (error) throw error

      setMemberName("")
      setEmail("")
      setErrorMsg("")
      setIsOpen(false)
      router.refresh()

    } catch (error: unknown) { 
      if (isPostgresError(error) && error.code === '23505') {
        setErrorMsg("Esta persona ya es miembro de este grupo.")
      } else if (error instanceof Error) {
        setErrorMsg(error.message)
      } else {
        setErrorMsg("Ocurrió un error al agregar el miembro. Inténtalo de nuevo.")
      }
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setIsOpen(false)
    setMemberName("")
    setEmail("")
    setErrorMsg("")
  }

  // Clases compartidas para consistencia
  const labelStyles = "text-xs font-semibold uppercase tracking-wider block mb-2 text-zinc-400";
  const inputBaseStyles = "w-full bg-black/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-zinc-600";

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full group flex items-center justify-center gap-3 rounded-2xl bg-blue-500/10 px-4 py-4 text-blue-400 border border-blue-500/20 font-semibold transition-all hover:bg-blue-500/20 hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] active:scale-[0.98]"
      >            
        <UserPlus className="w-5 h-5 transition-transform group-hover:scale-110" />
        <span>Agregar miembro</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          
          <div className="relative bg-[#121212] border border-white/10 w-full max-w-sm rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            
            {/* Header del modal */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Nuevo miembro</h2>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 rounded-full p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mensaje de error estilizado */}
            {errorMsg && (
              <div className="mb-6 p-3 bg-red-500/10 text-red-400 text-sm font-medium rounded-xl border border-red-500/20 flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                {errorMsg}
              </div>
            )}

            {/* Input Nombre */}
            <div className="mb-5">
              <label className={labelStyles}>Nombre del miembro</label>
              <input
                type="text"
                autoFocus
                placeholder="Ej: Nacho, Valu, Lucas..."
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                className={`${inputBaseStyles} p-3.5`}
              />
            </div>

            {/* Input Email */}
            <div className="mb-8">
              <label className={labelStyles}>
                Vincular cuenta <span className="text-zinc-600 normal-case tracking-normal">(Opcional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="email"
                  placeholder="email@usuario.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${inputBaseStyles} py-3.5 pr-3.5 pl-10`}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Si dejás esto vacío, se agregará como invitado.
              </p>
            </div>

            {/* Botón de Submit */}
            <button
              disabled={!memberName.trim() || loading}
              onClick={handleAddMember}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:bg-blue-600/30 disabled:text-white/50 active:scale-[0.98] flex items-center justify-center"
            >
              {loading ? "Verificando..." : "Confirmar"}
            </button>
          </div>
        </div>
      )}
    </>
  )
}