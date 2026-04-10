'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function removeMember(memberId: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('spending_group_members')
      .delete()
      .eq('id', memberId)

    if (error) throw error

    revalidatePath('/spending-groups/[id]', 'page') 
    return { success: true }
  } catch (error) {
    console.error("Error al borrar miembro:", error)
    return { success: false, error: "No se pudo borrar el miembro" }
  }
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