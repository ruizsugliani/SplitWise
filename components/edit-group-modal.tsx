'use client'

import { useState } from 'react'
import { EMOJIS } from '@/data/features'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Cog } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/confirm-modal' 

interface EditGroupModalProps {
  groupId: string
  initialName: string
  initialIcon: string
}

export function EditGroupModal({ groupId, initialName, initialIcon }: EditGroupModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedEmoji, setSelectedEmoji] = useState(initialIcon)
  const [groupName, setGroupName] = useState(initialName)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Estado para controlar la visibilidad del modal de confirmación
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const supabase = createClient()
  const router = useRouter()
  
  const handleUpdateGroup = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('spending_groups')
        .update({ 
            name: groupName, 
            icon: selectedEmoji 
        })
        .eq('id', groupId)

      if (error) throw error

      setIsOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Error al actualizar el grupo:", error)
      alert("Hubo un error al actualizar")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async () => {
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('spending_groups')
        .delete()
        .eq('id', groupId)

      if (error) throw error

      // Redirigir al usuario fuera del grupo eliminado
      router.push('/spending-groups')
      router.refresh() 
    } catch (error) {
      console.error("Error al eliminar el grupo:", error)
      alert("Hubo un error al eliminar. Verifica permisos.")
    } finally {
      setDeleting(false)
      setShowConfirmDelete(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-400 hover:text-white"
      >
        <Cog className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsOpen(false); setSelectedEmoji(initialIcon); setGroupName(initialName) } } />
          
          <div className="relative bg-white text-black w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Editar Grupo</h2>
              <button onClick={() => { setIsOpen(false); setSelectedEmoji(initialIcon); setGroupName(initialName) } } className="text-zinc-400 hover:text-black text-xl">✕</button>
            </div>

            <div className="mb-6">
              <label className="text-sm font-bold block mb-3 text-gray-800">Cambiar emoji</label>
              <div className="grid grid-cols-5 gap-2">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`h-12 flex items-center justify-center text-2xl rounded-xl border-2 transition-all ${
                      selectedEmoji === emoji ? 'border-blue-500 bg-blue-50' : 'border-zinc-100 hover:border-zinc-300'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="text-sm font-bold block mb-3 text-gray-800">Nombre del grupo</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-zinc-100 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              />
            </div>

            <button
              disabled={!groupName.trim() || loading}
              className="w-full bg-black text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50"
              onClick={handleUpdateGroup}
            >
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>
            
            {/* Zona de peligro */}
            <div className="mt-8 pt-6 border-t border-zinc-200">
              <div className="border border-red-500/30 rounded-2xl p-4 bg-red-500/5">
                <h3 className="text-red-600 font-bold mb-2 flex items-center gap-2">
                  <span className="text-lg">⚠️</span> ¡Cuidado!
                </h3>
                <p className="text-sm text-zinc-600 mb-4">
                  Al eliminar este grupo, perderás todos los gastos, balances y miembros de forma permanente. No se puede deshacer.
                </p>
                
                <button
                  disabled={deleting}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                  onClick={() => setShowConfirmDelete(true)}
                >
                  {deleting ? "Eliminando..." : "Eliminar este grupo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      <ConfirmModal 
        isOpen={showConfirmDelete}
        title="¿Estás seguro?"
        description={
          <>
            Vas a eliminar el grupo <span className="font-semibold text-red-500">{groupName}</span>. 
            Esta acción borrará toda la información asociada y no se puede deshacer.
          </>
        }
        confirmText="Eliminar"
        isLoading={deleting}
        onConfirm={handleDeleteGroup}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </>
  )
}