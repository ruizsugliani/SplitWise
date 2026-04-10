'use client'

import { useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AddMemberModalProps {
  groupId: string
}

export function AddMemberModal({ groupId }: AddMemberModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [memberName, setMemberName] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAddMember = async () => {
    if (!memberName.trim()) return
    setLoading(true)

    try {
      const { error } = await supabase
        .from('spending_group_members')
        .insert([{
          spending_group_id: groupId,
          member_name: memberName.trim(),
        }])

      if (error) throw error

      setMemberName("")
      setIsOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Error adding member:", error)
      alert("No se pudo agregar al miembro")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-800 py-4 px-4 rounded-2xl font-semibold transition-all border border-zinc-800 active:scale-95"
      >            
        <UserPlus className="w-5 h-5" />
        <span>Agregar miembro</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className="relative bg-white text-black w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Nuevo miembro</h2>
              <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-black">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
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

            <button
              disabled={!memberName.trim() || loading}
              onClick={handleAddMember}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? "Agregando..." : "Confirmar"}
            </button>
          </div>
        </div>
      )}
    </>
  )
}