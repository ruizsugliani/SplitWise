'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getRemainingSignerDebt } from '@/lib/utils/debt-calculator'

type CloseGroupResult = {
  success: boolean
  error?: string
}

type ExpenseSignerRow = {
  spending_group_member_id: string
  amount_due: number
  payments: { amount: number | string | null }[] | null
}

type ExpenseRow = {
  paid_by: string
  expense_signer: ExpenseSignerRow[] | null
}

export async function closeGroup(groupId: string): Promise<CloseGroupResult> {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Debes iniciar sesión para cerrar el grupo.' }
    }

    const { data: group, error: groupError } = await supabase
      .from('spending_groups')
      .select('id, created_by, closed_at')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return { success: false, error: 'No se encontró el grupo.' }
    }

    if (group.created_by !== user.id) {
      return { success: false, error: 'Solo el creador puede cerrar el grupo.' }
    }

    if (group.closed_at) {
      return { success: false, error: 'El grupo ya está cerrado.' }
    }

    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select(
        `
          paid_by,
          expense_signer (
            spending_group_member_id,
            amount_due,
            payments ( amount )
          )
        `
      )
      .eq('spending_group_id', groupId)

    if (expensesError) {
      return { success: false, error: 'No se pudieron obtener los gastos del grupo.' }
    }

    const hasPendingDebt = ((expensesData || []) as ExpenseRow[]).some((expense) =>
      (expense.expense_signer || []).some((signer) => {
        if (signer.spending_group_member_id === expense.paid_by) {
          return false
        }

        const totalPaid = (signer.payments || []).reduce(
          (sum, payment) => sum + (Number(payment.amount) || 0),
          0
        )

        return getRemainingSignerDebt(signer.amount_due, totalPaid) > 0
      })
    )

    if (hasPendingDebt) {
      return {
        success: false,
        error: 'No se puede cerrar el grupo: todavía hay deudas pendientes entre miembros.',
      }
    }

    const { error: closeError } = await supabase
      .from('spending_groups')
      .update({ closed_at: new Date().toISOString() })
      .eq('id', groupId)

    if (closeError) {
      return { success: false, error: 'No se pudo cerrar el grupo.' }
    }

    revalidatePath('/spending-groups', 'page')
    revalidatePath(`/spending-groups/${groupId}`, 'page')

    return { success: true }
  } catch (error) {
    console.error('Error al cerrar grupo:', error)
    return { success: false, error: 'Ocurrió un error inesperado al cerrar el grupo.' }
  }
}

export async function reopenGroup(groupId: string): Promise<CloseGroupResult> {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Debes iniciar sesión para reabrir el grupo.' }
    }

    const { data: group, error: groupError } = await supabase
      .from('spending_groups')
      .select('id, created_by, closed_at')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return { success: false, error: 'No se encontró el grupo.' }
    }

    if (group.created_by !== user.id) {
      return { success: false, error: 'Solo el creador puede reabrir el grupo.' }
    }

    if (!group.closed_at) {
      return { success: false, error: 'El grupo ya se encuentra abierto.' }
    }

    const { error: reopenError } = await supabase
      .from('spending_groups')
      .update({ closed_at: null })
      .eq('id', groupId)

    if (reopenError) {
      return { success: false, error: 'No se pudo reabrir el grupo.' }
    }

    revalidatePath('/spending-groups', 'page')
    revalidatePath(`/spending-groups/${groupId}`, 'page')

    return { success: true }
  } catch (error) {
    console.error('Error al reabrir grupo:', error)
    return { success: false, error: 'Ocurrió un error inesperado al reabrir el grupo.' }
  }
}
