'use client'

import { useState } from 'react'
import { Check, X, Trash2, Edit2, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { removeMember, updateGuestName } from '@/app/actions/members'

type Member = {
  id: string
  member_name: string | null  
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

const getMemberInfo = (member: Member) => {
  const isGuest = !member.profiles;
  const name = member.profiles?.full_name || member.member_name || 'Sin nombre';
  const rawAvatar = member.profiles?.avatar_url;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const avatar = rawAvatar 
    ? `${supabaseUrl}/storage/v1/object/public/avatars/${rawAvatar}` 
    : null;
    
  const initial = name.charAt(0).toUpperCase();

  return { name, avatar, initial, isGuest };
}

export function MembersListModal({ 
//   groupId, 
  members, 
  memberCount 
}: { 
  groupId: string, 
  members: Member[], 
  memberCount: number 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  
  const router = useRouter()

  const handleDelete = async (memberId: string) => {
    setIsDeleting(memberId)
    await removeMember(memberId)
    router.refresh()
    setIsDeleting(null)
  }

  const handleSaveEdit = async (memberId: string) => {
    if (!editName.trim()) return;
    
    setEditingId(null)
    await updateGuestName(memberId, editName)
    router.refresh()
  }

  const startEditing = (memberId: string, currentName: string) => {
    setEditingId(memberId)
    setEditName(currentName)
  }

  const displayMembers = members.slice(0, 3)
  const extraCount = Math.max(0, memberCount - 3)

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-3 bg-zinc-900 hover:bg-zinc-800 transition-colors py-4 px-4 rounded-2xl border border-zinc-800 w-full shadow-sm"
      >
        <div className="flex -space-x-2">
          {displayMembers.map((m, i) => {
            const { avatar, initial, isGuest } = getMemberInfo(m);
            return (
              <div 
                key={m.id} 
                className={`w-8 h-8 rounded-full border-2 border-zinc-900 flex items-center justify-center text-xs font-bold z-[${3-i}] overflow-hidden ${isGuest ? 'bg-zinc-800 text-zinc-400' : 'bg-blue-600 text-white'}`}
              >
                {avatar ? (
                  <Image src={avatar} alt="avatar" width={40} height={40} className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
              </div>
            )
          })}
          {extraCount > 0 && (
             <div className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 z-0">
               +{extraCount}
             </div>
          )}
        </div>
        <span className="text-zinc-400 font-medium">{memberCount} Miembros</span>
      </button>

      {/* 2. Modal ABM */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121212] border border-zinc-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
            
            {/* Header del Modal */}
            <div className="flex justify-between items-center p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-blue-500" />
                Gestión de Miembros
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Lista de Miembros */}
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {members.length === 0 ? (
                <p className="text-zinc-500 text-center py-4">No hay miembros aún.</p>
              ) : (
                <ul className="space-y-3">
                  {members.map((member) => {
                    const { name, avatar, initial, isGuest } = getMemberInfo(member);
                    const isEditingThis = editingId === member.id;

                    return (
                      <li key={member.id} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 transition-colors border border-zinc-800/50">
                        <div className="flex items-center gap-3 w-full">
                          
                          {/* Avatar en la lista */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden ${isGuest ? 'bg-zinc-800 text-zinc-400 border border-dashed border-zinc-600' : 'bg-blue-600 text-white'}`}>
                            {avatar ? (
                              <Image src={avatar} alt="avatar"  width={40} height={40} className="w-full h-full object-cover" />
                            ) : (
                              initial
                            )}
                          </div>
                          
                          {/* Nombre / Input de Edición */}
                          <div className="flex flex-col flex-1">
                            {isEditingThis ? (
                              <input 
                                autoFocus
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(member.id)}
                                className="bg-zinc-950 border border-blue-500 rounded px-2 py-1 text-sm text-white focus:outline-none w-full"
                              />
                            ) : (
                              <>
                                <span className="font-medium text-zinc-200">{name}</span>
                                {isGuest && <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Invitado</span>}
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Acciones */}
                        <div className="flex gap-1 ml-2">
                          {isEditingThis ? (
                            // Modo Edición: Mostrar botón de Guardar y Cancelar
                            <>
                              <button onClick={() => handleSaveEdit(member.id)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            // Modo Lectura: Mostrar Editar (solo si es invitado) y Borrar
                            <>
                              {isGuest && (
                                <button onClick={() => startEditing(member.id, name)} className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleDelete(member.id)}
                                disabled={isDeleting === member.id}
                                className={`p-2 rounded-lg transition-colors ${isDeleting === member.id ? 'opacity-50 cursor-not-allowed' : 'text-zinc-500 hover:text-red-400 hover:bg-red-400/10'}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            
            {/* Footer Modal */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
               <button onClick={() => setIsOpen(false)} className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors">
                 Cerrar
               </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}