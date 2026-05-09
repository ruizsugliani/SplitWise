"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function removePayment(paymentId: string, pathToRevalidate?: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId)

  if (error) {
    return { success: false, error: error.message }
  }

  if (pathToRevalidate) {
    revalidatePath(pathToRevalidate)
  }

  return { success: true }
}