"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type RecordInitialExpenseHistoryPayload = {
  expenseId: string
  amount: number
  date?: string | null
  pathToRevalidate?: string
}

type HistoryInsertAttempt = {
  expense_id: string
  date: string
  modified_by?: string | null
  movement_type?: string
  type?: string
  description?: string
  amount?: number
  old_value?: number
  new_value?: number
}

export async function recordInitialExpenseHistory({
  expenseId,
  amount,
  date,
  pathToRevalidate,
}: RecordInitialExpenseHistoryPayload) {
  if (!expenseId) {
    return { success: false, error: "No se recibio el gasto para historizar." }
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "El monto inicial del historial no es valido." }
  }

  const supabase = await createClient()

  const { data: existingRows } = await supabase
    .from("expense_history")
    .select("*")
    .eq("expense_id", expenseId)
    .limit(1)

  if (existingRows && existingRows.length > 0) {
    return { success: true, skipped: true }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const historyDate = date ?? new Date().toISOString()
  const attempts: HistoryInsertAttempt[] = [
    {
      expense_id: expenseId,
      movement_type: "debt",
      description: "Deuda inicial",
      amount,
      date: historyDate,
      modified_by: user?.id ?? null,
    },
    {
      expense_id: expenseId,
      type: "debt",
      description: "Deuda inicial",
      amount,
      date: historyDate,
      modified_by: user?.id ?? null,
    },
    {
      expense_id: expenseId,
      old_value: 0,
      new_value: amount,
      date: historyDate,
      modified_by: user?.id ?? null,
    },
  ]

  const errors: string[] = []
  for (const row of attempts) {
    const { error } = await supabase.from("expense_history").insert(row)
    if (!error) {
      if (pathToRevalidate) revalidatePath(pathToRevalidate)
      return { success: true }
    }

    errors.push(error.message)
  }

  return {
    success: false,
    error: errors[errors.length - 1] ?? "No se pudo registrar el historial inicial.",
  }
}
