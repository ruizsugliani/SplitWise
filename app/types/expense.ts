import { ExpenseSigner } from "../spending-groups/[id]/page"

export interface Expense {
  id: string
  paid_by: string
  paid_by_member_name: string
  created_at: string
  value: number
  description: string
  split_between: number
  expense_signer: ExpenseSigner[] // <- Miembros del gasto
  currentUserSigner?: ExpenseSigner | null
}