"use client"

import { Expense } from "@/app/types/expense";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from 'react'
import { ConfirmModal } from "./confirm-modal";
import { useRouter } from 'next/navigation'
import { removeExpense } from "@/app/actions/expenses";
import ToastConfirm from "./toast-confirmation";

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat("es-ES", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
};


export default function ExpenseCard({ expense }: { expense: Expense}) {
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  const confirmDelete = async () => {
    if (!expenseToDelete) return
    
    const id = expenseToDelete.id
    setExpenseToDelete(null)
    setIsDeleting(id)
    
    const result = await removeExpense(id)
    
    if (result.success) {
      setToastMessage("Gasto eliminado correctamente")
      router.refresh()
    } else {
      alert("Error al borrar")
    }
    setIsDeleting(null)
  }

  return (
    <div className="bg-zinc-900/60  border-white/5 rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{expense.description}</h3>
          <p className="text-sm text-zinc-400">Pagado por {expense.paid_by}</p>
        </div>

        <div className="flex items-start gap-3">
          <div className="text-right">
            <p className="font-semibold">
              ${expense.value.toFixed(2)}
            </p>
          </div>

          <button
            onClick={() => setExpenseToDelete(expense)}
            className="text-gray-400 hover:text-red-500 transition"
          >
            <Trash2 />
          </button>
        </div>
      </div>

      <div className="border-t my-3" />

      <div className="flex justify-between text-sm text-gray-500">
        <span>Dividido entre {expense.split_between} personas</span>
        <span>{formatDate(expense.created_at)}</span>
      </div>

    {/* 1. MODAL DE CONFIRMACIÓN (Sobre el anterior) */}
    {expenseToDelete && (
      <ConfirmModal 
        isOpen={expenseToDelete !== null}
        title="¿Estás seguro?"
        description={
          <>
            Vas a eliminar el gasto <span className="text-white font-semibold">
              {expenseToDelete ? expenseToDelete.description : ''}
            </span> de este grupo. Esta acción no se puede deshacer.
          </>
        }
        confirmText="Eliminar"
        isLoading={isDeleting === expenseToDelete?.id}
        onConfirm={confirmDelete}
        onCancel={() => setExpenseToDelete(null)}
      />
    )}

    {toastMessage && (
      <ToastConfirm toastMessage={toastMessage} />
    )}
    </div>
  );
}
