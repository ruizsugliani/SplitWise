"use client";

import { createClient } from "@/lib/supabase/client";
import ExpenseList from "./ui/expense-list";
import { useRouter } from "next/navigation";
import { Expense } from "@/app/types/expense";

export default function ExpensesClient({ expenses }: { expenses: Expense[] }) {
  const router = useRouter();
  const supabase = createClient();

  const handleDeleteExpense = async (id: string) => {
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error al eliminar gasto:", error);
    }
    router.refresh();
  };

  if (!expenses || !expenses.length) {
    return (
      <div className="text-center text-gray-500 py-10 border rounded-xl">
        Aún no se han registrado gastos. ¡Comienza agregando alguno!
      </div>
    );
  }

  return <ExpenseList expenses={expenses} onDelete={handleDeleteExpense} />;
}
