import { ExpenseWithSigners } from '@/app/types/expense'
import { Member } from '@/app/types/member'

export function memberHasPendingDebt(
  expenses: ExpenseWithSigners[],
  memberId: string
) {
  return expenses.some((expense) =>
    expense.expense_signer.some((signer) => {
      const belongsToMember =
        signer.spending_group_member_id === memberId

      const pending =
        signer.amount_due - signer.total_paid

      return belongsToMember && pending > 0.01
    })
  )
}

export function getCurrentMember(
  members: Member[],
  userId: string
) {
  return members.find((m) => m.profile_id === userId)
}