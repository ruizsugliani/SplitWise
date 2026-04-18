"use client";

import ExpenseList from "./ui/expense-list";
import { Expense } from "@/app/types/expense";

export default function ExpensesClient({ expenses }: { expenses: Expense[] }) {
  if (!expenses || !expenses.length) {
    return (
      <div className="text-center text-gray-500 py-10 border rounded-xl">
        Aún no se han registrado gastos. ¡Comienza agregando alguno!
      </div>
    );
  }

  return <ExpenseList expenses={expenses} />;
}
