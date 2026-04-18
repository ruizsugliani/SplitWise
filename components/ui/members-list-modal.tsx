'use client'

import { useState, useEffect } from 'react'
import { Check, X, Trash2, Edit2, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { removeMember, updateGuestName } from '@/app/actions/members'
import { ConfirmModal } from './confirm-modal'
import ToastConfirm  from './toast-confirmation'

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
  memberCount,
  creatorId
}: { 
  groupId: string, 
  members: Member[], 
  memberCount: number,
  creatorId: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  const confirmDelete = async () => {
    if (!memberToDelete) return
    
    const id = memberToDelete.id
    setMemberToDelete(null)
    setIsDeleting(id)
    
    const result = await removeMember(id)
    
    if (result.success) {
      setToastMessage("Miembro eliminado correctamente")
      router.refresh()
    } else {
      alert("Error al borrar")
    }
    setIsDeleting(null)
  }

  // const handleDelete = async (memberId: string) => {
  //   setIsDeleting(memberId)
  //   await removeMember(memberId)
  //   router.refresh()
  //   setIsDeleting(null)
  // }

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

      {/* MODAL PRINCIPAL */}
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
                    const isCreator = member.profiles?.id === creatorId;
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
                                {isCreator && <span className="text-[10px] uppercase tracking-wider text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Creador</span>}
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
                              {!isCreator && (
                                <button 
                                  onClick={() => setMemberToDelete(member)}
                                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>          
          </div>
        </div>
      )}

      {/* 1. MODAL DE CONFIRMACIÓN (Sobre el anterior) */}
      {memberToDelete && (
        <ConfirmModal 
          isOpen={memberToDelete !== null}
          title="¿Estás seguro?"
          description={
            <>
              Vas a eliminar a <span className="text-white font-semibold">
                {memberToDelete ? getMemberInfo(memberToDelete).name : ''}
              </span> de este grupo. Esta acción no se puede deshacer.
            </>
          }
          confirmText="Eliminar"
          isLoading={isDeleting === memberToDelete?.id}
          onConfirm={confirmDelete}
          onCancel={() => setMemberToDelete(null)}
        />
      )}

      {/* 2. TOAST DE CONFIRMACIÓN (Notificación flotante) */}
      {toastMessage && (
        <ToastConfirm toastMessage={toastMessage}/>
      )}
    </>
  )
}