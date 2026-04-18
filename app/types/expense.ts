export interface Expense {
  id: string
  paid_by: string
  created_at: string
  value: number
  description: string
  split_between: number
  expense_signer?: { spending_group_member_id: string }[];
  member_ids?: string[];
}
export interface ExpensesProps {
  expenses: Expense[],
  groupId: string,
  members: Member[]
}

export interface ExpenseProps {
  expense: Expense,
  groupId: string,
  members: Member[]
}