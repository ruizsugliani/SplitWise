export interface Expense {
  id: string
  paid_by: string
  created_at: string
  value: number
  description: string
  split_between: number
}