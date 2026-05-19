'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, X, Trash2, Edit2, Users, Link2, Mail, MoreVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { removeMember, updateGuestName, linkMemberToProfile } from '@/app/actions/members'
import { ConfirmModal } from './confirm-modal'
import ToastConfirm  from './toast-confirmation'
import type { Member } from '@/app/types/member'

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
  // groupId, 
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

  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [linkEmail, setLinkEmail] = useState("")
  const [linkError, setLinkError] = useState("")
  const [isLinking, setIsLinking] = useState(false)

  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // NUEVO: Estado para el menú de los tres puntitos
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const router = useRouter()

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  // Cierra el menú desplegable si se hace clic afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const startLinking = (memberId: string) => {
    setLinkingId(memberId)
    setLinkEmail("")
    setLinkError("")
  }

  const cancelLinking = () => {
    setLinkingId(null)
    setLinkEmail("")
    setLinkError("")
  }

  const handleLinkAccount = async (memberId: string) => {
    if (!linkEmail.trim()) return
    setIsLinking(true)
    setLinkError("")

    const result = await linkMemberToProfile(memberId, linkEmail)

    if (result.success) {
      setLinkingId(null)
      setLinkEmail("")
      setToastMessage("Cuenta vinculada correctamente")
      router.refresh()
    } else {
      setLinkError(result.error ?? "Error al vincular.")
    }
    setIsLinking(false)
  }

  const displayMembers = members.slice(0, 3)
  const extraCount = Math.max(0, memberCount - 3)

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between bg-zinc-900/60 border border-white/5 rounded-2xl p-4 hover:bg-zinc-800 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {displayMembers.map((m, i) => {
              const { avatar, initial } = getMemberInfo(m);
              return (
                <div 
                  key={m.id} 
                  className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300 overflow-hidden relative"
                  style={{ zIndex: 3 - i }}
                >
                  {avatar ? (
                    <Image src={avatar} alt="avatar" fill className="object-cover" sizes="32px" />
                  ) : (
                    initial
                  )}
                </div>
              )
            })}
            {extraCount > 0 && (
               <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 z-0 relative">
                 +{extraCount}
               </div>
            )}
          </div>
          <span className="font-semibold text-zinc-300">{memberCount} Miembros</span>
        </div>
      </button>

      {/* MODAL PRINCIPAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121212] border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
            
            {/* Header del Modal */}
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-blue-400" />
                Gestión de Miembros
              </h2>
              <button onClick={() => setIsOpen(false)} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de Miembros */}
            <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar pb-10" ref={menuRef}>
              {members.length === 0 ? (
                <p className="text-zinc-500 text-center py-4">No hay miembros aún.</p>
                ) : (
                <ul className="space-y-3">
                  {members.map((member) => {
                    const { name, avatar, initial, isGuest } = getMemberInfo(member);
                    const isEditingThis = editingId === member.id;
                    const isLinkingThis = linkingId === member.id;
                    const isCreator = member.profiles?.id === creatorId;
                    const isMenuOpen = openMenuId === member.id;
                    
                    return (
                      <li key={member.id} className="flex flex-col p-3 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors border border-white/5 relative">
                        <div className="flex items-center justify-between w-full">
                          
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Avatar en la lista */}
                            <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold shadow-inner relative overflow-hidden ${isCreator ? 'bg-linear-to-br from-blue-500 to-blue-600 text-white' : 'bg-linear-to-br from-zinc-700 to-zinc-800 text-white'}`}>
                              {avatar ? (
                                <Image src={avatar} alt="avatar" fill className="object-cover" sizes="40px" />
                              ) : (
                                initial
                              )}
                            </div>

                            {/* Nombre / Input de Edición / Badges */}
                            <div className="flex flex-col flex-1 min-w-0">
                              {isEditingThis ? (
                                <input
                                  autoFocus
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(member.id)}
                                  className="bg-black/50 border border-emerald-500/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500 w-full"
                                />
                              ) : isLinkingThis ? (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                                  <input
                                    autoFocus
                                    type="email"
                                    value={linkEmail}
                                    onChange={(e) => { setLinkEmail(e.target.value); setLinkError("") }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLinkAccount(member.id)}
                                    placeholder="email@usuario.com"
                                    className="bg-black/50 border border-blue-500/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 w-full"
                                  />
                                </div>
                              ) : (
                                <>
                                  <span className="font-semibold text-white text-sm truncate">{name}</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {isGuest && <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">Invitado</span>}
                                    {!isGuest && member.profiles?.email && <span className="text-xs text-zinc-500 truncate">{member.profiles.email}</span>}
                                    {isCreator && <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">Creador</span>}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="flex gap-1 ml-2 shrink-0">
                            {isEditingThis ? (
                              <>
                                <button onClick={() => handleSaveEdit(member.id)} className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditingId(null)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : isLinkingThis ? (
                              <>
                                <button
                                  onClick={() => handleLinkAccount(member.id)}
                                  disabled={!linkEmail.trim() || isLinking}
                                  className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors disabled:opacity-40"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={cancelLinking} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <div className="relative">
                                {/* Botón Menú Kebab */}
                                <button
                                  onClick={() => setOpenMenuId(isMenuOpen ? null : member.id)}
                                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                >
                                  <MoreVertical className="w-5 h-5" />
                                </button>

                                {/* Dropdown Flotante */}
                                {isMenuOpen && (
                                  <div className="absolute right-0 top-10 w-48 rounded-2xl bg-[#1a1a1a] border border-white/10 shadow-2xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                                    {isGuest && (
                                      <>
                                        <button 
                                          onClick={() => { startLinking(member.id); setOpenMenuId(null); }} 
                                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5 hover:text-blue-400 transition-colors"
                                        >
                                          <Link2 className="w-4 h-4" />
                                          Vincular cuenta
                                        </button>
                                        <button 
                                          onClick={() => { startEditing(member.id, name); setOpenMenuId(null); }} 
                                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5 hover:text-emerald-400 transition-colors"
                                        >
                                          <Edit2 className="w-4 h-4" />
                                          Editar nombre
                                        </button>
                                        <div className="h-px bg-white/5 my-1 mx-2" />
                                      </>
                                    )}
                                    {!isCreator && (
                                      <button
                                        onClick={() => { setMemberToDelete(member); setOpenMenuId(null); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        Eliminar miembro
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Error inline para vinculación */}
                        {isLinkingThis && linkError && (
                          <p className="mt-2 text-xs text-red-400 pl-13">{linkError}</p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>          
          </div>
        </div>
      )}

      {/* 1. MODAL DE CONFIRMACIÓN */}
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

      {/* 2. TOAST DE CONFIRMACIÓN */}
      {toastMessage && (
        <ToastConfirm toastMessage={toastMessage}/>
      )}
    </>
  )
}