'use client'

import { useState } from 'react'
import { EMOJIS } from '@/data/features'
import { createClient } from '@/lib/supabase/client'
// import { Button } from '@/components/ui/button'

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
        className="fixed bottom-8 right-6 w-16 h-16 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-400 rounded-full shadow-2xl flex items-center justify-center text-3xl hover:bg-emerald-500/30 hover:scale-110 active:scale-95 transition-all z-40"
        title="Crear un nuevo grupo"
      >
        +
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className="relative bg-[#121212] border border-white/10 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-start mb-8">
               <div>
                 <h2 className="text-2xl font-bold text-white mb-1">Crear grupo</h2>
                 <p className="text-zinc-500 text-sm">Comienza a rastrear gastos con amigos.</p>
               </div>
               <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 rounded-full p-2">
                 ✕
               </button>
             </div>

             <div className="mb-6">
               <label className="text-xs font-semibold uppercase tracking-wider block mb-3 text-zinc-400">Elige un ícono</label>
               <div className="grid grid-cols-5 gap-2">
                 {EMOJIS.map((emoji) => (
                   <button
                     key={emoji}
                     type="button"
                     onClick={() => setSelectedEmoji(emoji)}
                     className={`h-12 flex items-center justify-center text-2xl rounded-xl border transition-all ${
                       selectedEmoji === emoji 
                        ? 'border-emerald-500/50 bg-emerald-500/10' 
                        : 'border-white/5 hover:border-white/20 hover:bg-white/5'
                     }`}
                   >
                     {emoji}
                   </button>
                 ))}
               </div>
             </div>

            <div className="mb-8">
              <label className="text-xs font-semibold uppercase tracking-wider block mb-3 text-zinc-400">Nombre del grupo</label>
              <input
                type="text"
                placeholder="Ej: Viaje a la costa, Asado..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none placeholder:text-zinc-600 transition-all"
              />
            </div>

            <button
              disabled={!groupName.trim() || loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:bg-emerald-600/50 flex items-center justify-center active:scale-[0.98]"
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