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

export async function updatePayment(
  paymentId: string,
  payload: { amount: number; paidAt: string },
  pathToRevalidate?: string
) {
  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    return { success: false, error: 'El monto del pago no es valido.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('payments')
    .update({
      amount: payload.amount,
      paid_at: payload.paidAt,
    })
    .eq('id', paymentId)
    .select('id, amount, paid_at')
    .maybeSingle()

  if (error) {
    return { success: false, error: error.message }
  }

  if (!data) {
    return {
      success: false,
      error: 'No se pudo confirmar la actualizacion del pago. Revisa las politicas de permisos de payments.',
    }
  }

  if (pathToRevalidate) {
    revalidatePath(pathToRevalidate)
  }

  return { success: true, payment: data }
}
