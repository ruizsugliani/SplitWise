import { Currency } from "./currency"
import { Member } from "./member"

export interface Expense {
  id: string
  paid_by: string
  created_at: string
  value: number
  description: string
  split_between: number
  expense_signer?: { spending_group_member_id: string }[];
  member_ids?: string[];
  currency_id: string;
}
export interface ExpensesProps {
  expenses: Expense[],
  groupId: string,
  members: Member[];
  currencies: Currency[];
}

export interface ExpenseProps {
  expense: Expense,
  groupId: string,
  members: Member[];
  currencies: Currency[];
}

export type ExpenseSigner = {
  spending_group_member_id: string
  spending_group_members: Member | null
}

export type ExpenseWithSigners = Expense & {
  expense_signer: ExpenseSigner[]
}