import { createClient } from "@/lib/supabase/server";
import ExpenseCard from "./expense-card";

export default async function ExpenseList({ groupId }: { groupId: string }) {
  const supabase = await createClient();

  const { data: expenses, error } = await supabase
    .from("expenses_with_details")
    .select("*")
    .eq("spending_group_id", groupId);

  if (error || !expenses || !expenses.length) {
    return (
      <div className="text-center text-gray-500 py-10 border rounded-xl">
        Aún no se han registrado gastos. ¡Comienza agregando alguno!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {expenses.map((expense) => (
        <ExpenseCard key={expense.id} expense={expense} />
      ))}
    </div>
  );
}
