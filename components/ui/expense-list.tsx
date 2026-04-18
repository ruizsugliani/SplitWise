"use client";

import { Expense } from "@/app/types/expense";
import ExpenseCard from "./expense-card";

export default function ExpenseList({
  expenses,
}: {
  expenses: Expense[];
}) {
  return (
    <div className="space-y-4">
      {expenses.map((expense) => (
        <ExpenseCard key={expense.id} expense={expense} />
      ))}
    </div>
  );
}
