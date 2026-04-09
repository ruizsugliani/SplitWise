'use client'

import { useState } from 'react'
import { EMOJIS } from '@/data/features'
import { createClient } from '@/lib/supabase/client'

export function CreateGroupModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedEmoji, setSelectedEmoji] = useState("🎉")
  const [groupName, setGroupName] = useState("")
  const [loading, setLoading] = useState(false) // <-- Estado de carga

  const supabase = createClient()
  
  const handleCreateGroup = async () => {
    setLoading(true) // Bloqueamos el botón
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No hay usuario")

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      const displayName = profile?.full_name || "Admin"

      const { data: group, error: groupError } = await supabase
        .from('spending_groups')
        .insert([{ 
            name: groupName, 
            icon: selectedEmoji,
            created_by: user.id 
        }])
        .select()
        .single()

      if (groupError) throw groupError

      const { error: memberError } = await supabase
        .from('spending_group_members')
        .insert([{
            spending_group_id: group.id,
            member_name: displayName,
            profile_id: user.id
        }])

      if (memberError) throw memberError

      setIsOpen(false)
      setGroupName("")
      window.location.reload() 
    } catch (error) {
      console.error("Error al crear el grupo:", error)
      alert("Hubo un error al crear el grupo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-white text-black rounded-full shadow-2xl flex items-center justify-center text-3xl hover:scale-110 active:scale-95 transition-all z-20"
      >
        +
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className="relative bg-white text-black w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* ... Encabezado y Selector de Emojis se mantienen igual ... */}
            
            <div className="flex justify-between items-start mb-6">
               <div>
                 <h2 className="text-2xl font-bold text-gray-900">Crear un nuevo grupo</h2>
                 <p className="text-zinc-500 text-sm">Comienza a rastrear gastos.</p>
               </div>
               <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-black text-xl">✕</button>
             </div>

             <div className="mb-6">
               <label className="text-sm font-bold block mb-3 text-gray-800">Elije un emoji</label>
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
                placeholder="e.g., Viaje Verano, Cena Amigos"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-zinc-100 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              />
            </div>

            <button
              disabled={!groupName.trim() || loading}
              className="w-full bg-black text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center"
              onClick={handleCreateGroup}
            >
              {loading ? "Creando..." : "Crear Grupo"}
            </button>
          </div>
        </div>
      )}
    </>
  )
}