import { Currency } from "./currency"
import { Member } from "./member"

export type ExpenseSigner = {
  id: string
  spending_group_member_id: string
  spending_group_members: Member | null
  amount_due: number
  total_paid: number
}

export interface Expense {
  id: string
  paid_by: string
  paid_by_member_name: string
  created_at: string
  value: number
  description: string
  split_between: number
  member_ids?: string[]; // Lo mantenemos porque lo usa el modal de edición
  currency_id: string;
}

export type ExpenseWithSigners = Expense & {
  expense_signer: ExpenseSigner[];
  currentUserSigner?: ExpenseSigner | null;
}

export interface ExpensesProps {
  expenses: ExpenseWithSigners[],
  groupId: string,
  members: Member[];
  currencies: Currency[];
}

export interface ExpenseProps {
  expense: ExpenseWithSigners,
  groupId: string,
  members: Member[];
  currencies: Currency[];
}