'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type CloseGroupResult = {
  success: boolean
  error?: string
}

type ExpenseSignerRow = {
  spending_group_member_id: string
}

type ExpenseRow = {
  id: string
  paid_by: string
  value: number
  currency_id: string | null
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

    const { data: membersData, error: membersError } = await supabase
      .from('spending_group_members')
      .select('id')
      .eq('spending_group_id', groupId)

    if (membersError) {
      return { success: false, error: 'No se pudieron obtener los miembros del grupo.' }
    }

    const memberIds = (membersData || []).map((m) => m.id)

    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select(
        `
          id,
          paid_by,
          value,
          currency_id,
          expense_signer ( spending_group_member_id )
        `
      )
      .eq('spending_group_id', groupId)

    if (expensesError) {
      return { success: false, error: 'No se pudieron obtener los gastos del grupo.' }
    }

    const balancesByCurrency: Record<string, Record<string, number>> = {}

    for (const expense of (expensesData || []) as ExpenseRow[]) {
      const currencyId = expense.currency_id || 'default'
      if (!balancesByCurrency[currencyId]) {
        balancesByCurrency[currencyId] = {}
      }

      const signers = expense.expense_signer || []
      if (signers.length === 0) {
        continue
      }

      const share = Number(expense.value || 0) / signers.length

      for (const signer of signers) {
        const memberId = signer.spending_group_member_id
        balancesByCurrency[currencyId][memberId] =
          (balancesByCurrency[currencyId][memberId] || 0) - share
      }

      balancesByCurrency[currencyId][expense.paid_by] =
        (balancesByCurrency[currencyId][expense.paid_by] || 0) + Number(expense.value || 0)
    }

    const tolerance = 0.01
    const hasPendingDebt = Object.values(balancesByCurrency).some((balances) =>
      memberIds.some((memberId) => Math.abs(balances[memberId] || 0) > tolerance)
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
