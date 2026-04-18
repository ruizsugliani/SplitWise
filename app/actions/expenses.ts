'use server'

import { createClient } from '@/lib/supabase/server'

export async function removeExpense(expenseId: string) {
      const supabase = await createClient()
    
      try {    
        
        const { error: deleteError } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId)
        .select();
        
        if (deleteError) throw deleteError


      } catch (error) {
        console.error("Error al borrar miembro:", error)
        return { success: false, error: "No se pudo borrar el miembro" }
      }

    return { success: true }
}