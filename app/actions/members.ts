'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function removeMember(memberId: string) {
  const supabase = await createClient()
  let shouldRedirect = false;

  try {
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Buscamos al miembro Y al grupo al que pertenece en la misma consulta
    const { data: member, error: fetchError } = await supabase
      .from('spending_group_members')
      .select(`
        profile_id, 
        spending_group_id,
        spending_groups ( created_by )
      `)
      .eq('id', memberId)
      .single()

    if (fetchError || !member) throw new Error("No se encontró el miembro")

    const groupInfo = member.spending_groups as unknown as { created_by: string } 
    const isCreator = member.profile_id === groupInfo?.created_by;
    
    if (isCreator) {
      return { success: false, error: "El creador del grupo no puede ser eliminado." }
    }

    const { error: deleteError } = await supabase
      .from('spending_group_members')
      .delete()
      .eq('id', memberId)

    if (deleteError) throw deleteError

    if (user && member.profile_id === user.id) {
      shouldRedirect = true;
    } else {
      revalidatePath(`/spending-groups/${member.spending_group_id}`, 'page')
    }

  } catch (error) {
    console.error("Error al borrar miembro:", error)
    return { success: false, error: "No se pudo borrar el miembro" }
  }

  if (shouldRedirect) {
    redirect('/spending-groups') 
  }

  return { success: true }
}

export async function updateGuestName(memberId: string, newName: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('spending_group_members')
      .update({ member_name: newName })
      .eq('id', memberId)

    if (error) throw error

    revalidatePath('/spending-groups/[id]', 'page')
    return { success: true }
  } catch (error) {
    console.error("Error al actualizar nombre:", error)
    return { success: false, error: "No se pudo actualizar el nombre" }
  }
}