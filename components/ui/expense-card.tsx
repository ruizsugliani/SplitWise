"use client"

import { Expense } from "@/app/types/expense";
import { Trash2, Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useState } from 'react'
import { ConfirmModal } from "./confirm-modal";
import { useRouter } from 'next/navigation'
import { removeExpense } from "@/app/actions/expenses";
import ToastConfirm from "./toast-confirmation";
import { PaymentModal } from "../payment-modal";

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat("es-ES", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
};


export default function ExpenseCard({ expense }: { expense: Expense}) {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
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

  const isFullyPaid = expense.expense_signer.every(
    (s) => s.total_paid >= s.amount_due - 0.01 
  );

  const signersOptions = expense.expense_signer.map(es => ({
    id: es.id,
    name: es.spending_group_members?.member_name || es.spending_group_members?.profiles?.full_name || 'Miembro',
    amountDue: es.amount_due,
    totalPaid: es.total_paid
  }))

  return (
    <div className={`bg-zinc-900/60 rounded-xl p-4 shadow-sm border ${isFullyPaid ? 'border-emerald-500/30' : 'border-amber-500/30'}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium flex items-center gap-2">
            {expense.description}
            {/* 3. Icono de estado */}
            {isFullyPaid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500" />
            )}
          </h3>
          <p className="text-sm text-zinc-400">Pagado por {expense.paid_by_member_name}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-semibold">${expense.value.toFixed(2)}</p>
          </div>

          {/* Botón para abrir el modal de pago */}
          <button
            onClick={() => setIsPaymentOpen(true)}
            className="text-gray-400 hover:text-green-500 transition"
            title="Registrar pago"
          >
            <Wallet className="w-5 h-5" />
          </button>

          <button
            onClick={() => setExpenseToDelete(expense)}
            className="text-gray-400 hover:text-red-500 transition"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="border-t my-3 border-white/5" />

      <div className="flex justify-between text-sm text-gray-500">
        <span>Dividido entre {expense.split_between} personas</span>
        <span>{formatDate(expense.created_at)}</span>
      </div>

      {/* MODAL DE PAGO */}
      <PaymentModal 
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        signers={signersOptions}
      />

      {/* MODAL DE ELIMINACIÓN */}
      {expenseToDelete && (
        <ConfirmModal 
          isOpen={expenseToDelete !== null}
          title="¿Estás seguro?"
          description={
            <>
              Vas a eliminar el gasto <span className="text-white font-semibold">
                {expenseToDelete.description}
              </span> de este grupo. Esta acción no se puede deshacer.
            </>
          }
          confirmText="Eliminar"
          isLoading={isDeleting === expenseToDelete?.id}
          onConfirm={confirmDelete}
          onCancel={() => setExpenseToDelete(null)}
        />
      )}

      {toastMessage && <ToastConfirm toastMessage={toastMessage} />}
    </div>
  );
}
