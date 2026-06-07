"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type PaymentDebtPayment = {
  id: string
  amount: number | string | null
}

type PaymentDebtRow = {
  id: string
  original_amount: number | string | null
  payments: PaymentDebtPayment[] | null
}

type PaymentRow = {
  id: string
  amount: number | string | null
  paid_at: string | null
  created_at: string
  debt_id: string | null
  debts: PaymentDebtRow[] | PaymentDebtRow | null
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function getSingleDebt(debts: PaymentRow['debts']) {
  if (!debts) return null
  return Array.isArray(debts) ? debts[0] ?? null : debts
}

function toMinutePrecision(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    0,
    0
  )
}

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
  payload: { amount: number; paidAt: string; observations?: string | null },
  pathToRevalidate?: string
) {
  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    return { success: false, error: 'El monto del pago no es valido.' }
  }

  const supabase = await createClient()

  const { data: currentPayment, error: fetchError } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      paid_at,
      created_at,
      debt_id,
      debts!inner (
        id,
        original_amount,
        payments (
          id,
          amount
        )
      )
    `)
    .eq('id', paymentId)
    .single()

  if (fetchError || !currentPayment) {
    return { success: false, error: fetchError?.message || 'No se pudo encontrar el pago.' }
  }

  const payment = currentPayment as unknown as PaymentRow
  const debt = getSingleDebt(payment.debts)

  if (!debt) {
    return { success: false, error: 'No se pudo encontrar la deuda asociada al pago.' }
  }

  const originalAmount = toNumber(debt.original_amount)
  if (originalAmount === null) {
    return { success: false, error: 'No se pudo determinar el monto original de la deuda.' }
  }

  const otherPaymentsTotal = (debt.payments || []).reduce((sum, paymentRow) => {
    if (paymentRow.id === paymentId) return sum
    return sum + (toNumber(paymentRow.amount) ?? 0)
  }, 0)
  const maxEditableAmount = Math.max(0, originalAmount - otherPaymentsTotal)

  if (payload.amount > maxEditableAmount + 0.00001) {
    return {
      success: false,
      error: `El monto no puede superar ${maxEditableAmount.toFixed(2)} porque es el máximo permitido para esta deuda.`,
    }
  }

  const originalDateIso = payment.created_at
  const originalDate = toMinutePrecision(new Date(originalDateIso))
  const nextDate = new Date(payload.paidAt)

  if (Number.isNaN(originalDate.getTime()) || Number.isNaN(nextDate.getTime())) {
    return { success: false, error: 'La fecha y hora del pago no son válidas.' }
  }

  if (nextDate.getTime() < originalDate.getTime()) {
    return {
      success: false,
      error: 'La fecha y hora no pueden ser anteriores al pago original.',
    }
  }

  const { error } = await supabase
    .from('payments')
    .update({
      amount: payload.amount,
      paid_at: payload.paidAt,
      observations: payload.observations ?? null,
    })
    .eq('id', paymentId)

  if (error) {
    return { success: false, error: error.message }
  }

  if (pathToRevalidate) {
    revalidatePath(pathToRevalidate)
  }

  return {
    success: true,
    payment: {
      id: paymentId,
      amount: payload.amount,
      paid_at: payload.paidAt,
    },
  }
}
