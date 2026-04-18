"use client";

import { ExpensesProps } from "@/app/types/expense";
import ExpenseCard from "./expense-card";

export default function ExpenseList({ expenses, groupId, members }: ExpensesProps ) {
  return (
    <div className="space-y-4">
      {expenses.map((expense) => (
        <ExpenseCard key={expense.id} expense={expense} groupId={groupId} members={members} />
      ))}
    </div>
  );
}
