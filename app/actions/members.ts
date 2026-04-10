'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function removeMember(memberId: string) {
  const supabase = await createClient()
  
  let shouldRedirect = false;

  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: member, error: fetchError } = await supabase
      .from('spending_group_members')
      .select('profile_id, spending_group_id')
      .eq('id', memberId)
      .single()

    if (fetchError || !member) throw new Error("No se encontró el miembro")

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