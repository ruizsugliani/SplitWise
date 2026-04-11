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
  const [email, setEmail] = useState("") // NUEVO: Estado para el email
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("") // NUEVO: Estado para mostrar errores
  
  const router = useRouter()
  const supabase = createClient()

  const handleAddMember = async () => {
    if (!memberName.trim()) return
    setLoading(true)
    setErrorMsg("") // Limpiamos errores previos

    try {
      let profileId = null;

      // 1. Si el usuario ingresó un email, buscamos si existe en la base
      if (email.trim()) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.trim())
          .single()

        // Si hay error (no se encontró) o no hay perfil, cortamos la ejecución
        if (profileError || !profile) {
          setErrorMsg("No se encontró ninguna cuenta con este email.")
          setLoading(false)
          return 
        }
        
        // Si lo encontró, guardamos el ID para asociarlo
        profileId = profile.id
      }

      // 2. Insertamos el miembro (con o sin profile_id dependiendo del paso 1)
      const { error } = await supabase
        .from('spending_group_members')
        .insert([{
          spending_group_id: groupId,
          member_name: memberName.trim(),
          profile_id: profileId, // Si es null, queda como invitado en la base
        }])

      if (error) throw error

      // 3. Éxito: Limpiamos y cerramos
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

  // Función auxiliar para cerrar y limpiar el modal
  const closeModal = () => {
    setIsOpen(false)
    setMemberName("")
    setEmail("")
    setErrorMsg("")
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-800 py-4 px-4 rounded-2xl font-semibold transition-all border border-zinc-800 active:scale-95"
      >            
        <UserPlus className="w-5 h-5 text-white" />
        <span className="text-white">Agregar miembro</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          
          <div className="relative bg-white text-black w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Nuevo miembro</h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-black transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mostrar mensaje de error si existe */}
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm font-medium rounded-xl border border-red-200">
                {errorMsg}
              </div>
            )}

            <div className="mb-4">
              <label className="text-sm font-bold block mb-2 text-gray-700">Nombre del miembro</label>
              <input
                type="text"
                autoFocus
                placeholder="Ej: Nacho, Valu, Lucas..."
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                className="w-full bg-zinc-100 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              />
            </div>

            <div className="mb-6">
              <label className="text-sm font-bold block mb-2 text-gray-700">Vincular cuenta <span className="text-zinc-400 font-normal">(Opcional)</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  type="email"
                  placeholder="email@usuario.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-100 border-none rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Si dejás esto vacío, se agregará como invitado.
              </p>
            </div>

            <button
              disabled={!memberName.trim() || loading}
              onClick={handleAddMember}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? "Verificando..." : "Confirmar"}
            </button>
          </div>
        </div>
      )}
    </>
  )
}