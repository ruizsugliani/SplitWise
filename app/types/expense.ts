import { Currency } from "./currency"
import { Member } from "./member"

export type ExpenseSigner = {
  id: string
  spending_group_member_id: string
  spending_group_members: Member | null
  amount_due: number
  total_paid: number
  is_payer?: boolean
}

export interface ExpensePayer {
  spending_group_member_id: string;
  amount_paid: number;
  member_name?: string;
}

export interface Expense {
  id: string;
  created_at: string;
  value: number;
  description: string;
  split_between: number;
  currency_id: string;
  member_ids?: string[]; 
  receipt_url?: string | null;
  payers?: ExpensePayer[]; 
  paid_by?: string | null;
  paid_by_member_name?: string | null;
  expense_signer?: any[];
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