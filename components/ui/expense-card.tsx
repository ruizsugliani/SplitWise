import { Expense } from "@/app/types/expense";

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat("es-ES", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
};

export default function ExpenseCard({ expense }: { expense: Expense }) {
  return (
    <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900">{expense.description}</h3>
          <p className="text-sm text-gray-500">Pagado por {expense.paid_by}</p>
        </div>

        <div className="text-right">
          <p className="font-semibold text-gray-900">
            ${expense.value.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="border-t my-3" />

      <div className="flex justify-between text-sm text-gray-500">
        <span>Dividido entre {expense.split_between} personas</span>
        <span>{formatDate(expense.created_at)}</span>
      </div>
    </div>
  );
}
