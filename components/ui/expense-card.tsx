"use client"

import { Expense, ExpenseProps } from "@/app/types/expense";
import { Edit2, Trash2, Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useState } from 'react'
import { ConfirmModal } from "./confirm-modal";
import { useRouter } from 'next/navigation'
import { removeExpense } from "@/app/actions/expenses";
import ToastConfirm from "./toast-confirmation";
import { AddExpenseModal } from "../add-expense-modal";
// import { format } from "path";
import { formatCurrency } from "@/app/types/currency";
import { PaymentModal } from "../payment-modal";

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat("es-ES", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
};


export default function ExpenseCard({ 
  expense,
  members,
  currencies,
  groupId
}: { 
  expense: ExpenseWithSigners;
  members: Member[];
  currencies: Currency[];
  groupId: string;
}) {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const router = useRouter()
  const expenseCurrency = currencies.find(c => c.id === expense.currency_id);
  const currencyCode = expenseCurrency?.code || 'ARS';

  console.log(expense);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  const getPayerName = (payerId: string) => {
    const member = members.find(m => m.id === payerId);
    if (!member) return "Desconocido";
    return member.profiles?.full_name || member.member_name || "Desconocido";
  };

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
            {/* Icono de estado de pago */}
            {isFullyPaid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500" />
            )}
          </h3>
          {/* Usamos la propiedad que ya viene lista desde el page.tsx */}
          <p className="text-sm text-zinc-400">Pagado por {expense.paid_by_member_name}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
<p className="font-semibold">
              {formatCurrency(expense.value, currencyCode)}
            </p>
          </div>

          {/* Botón de Editar (De tu rama) */}
          <button
            onClick={() => setIsEditing(true)}
            className="text-zinc-500 hover:text-blue-400 transition-colors"
            title="Editar gasto"
          >
            <Edit2 className="w-4 h-4"/>
          </button>

          {/* Botón de Pagar (De main) */}
          <button
            onClick={() => setIsPaymentOpen(true)}
            className="text-zinc-500 hover:text-emerald-400 transition-colors"
            title="Registrar pago"
          >
            <Wallet className="w-4 h-4" />
          </button>

          {/* Botón de Borrar */}
          <button
            onClick={() => setExpenseToDelete(expense)}
            className="text-zinc-500 hover:text-red-400 transition-colors"
            title="Borrar gasto"
          >
            <Trash2 className="w-4 h-4" />
        </div>
      </div>

      <div className="border-t my-3 border-white/5" />

      <div className="flex justify-between text-sm text-gray-500">
        <span>Dividido entre {expense.split_between} personas</span>
        <span>{formatDate(expense.created_at)}</span>
      </div>

{/* 1. MODAL DE PAGO (De main) */}
      <PaymentModal 
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        signers={signersOptions}
      />

      {/* 2. MODAL DE ELIMINACIÓN (Fusionado) */}
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

      {/* 3. MODAL DE EDICIÓN (De tu rama) */}
      {isEditing && (
        <AddExpenseModal 
          groupId={expense.spending_group_id} // Ajustado para tomar el ID del gasto
          members={members}
          expenseToEdit={{
            ...expense,
            member_ids: expense.expense_signer?.map(signer => signer.spending_group_member_id) || []
          }}
          onCloseExternal={() => setIsEditing(false)}
          onSuccess={(msg) => setToastMessage(msg)}
          currencies={currencies}
        />
      )}

      {/* 4. TOAST DE CONFIRMACIÓN */}
      {toastMessage && <ToastConfirm toastMessage={toastMessage} />}
    </div>
  );
}
    </div>
  );
}
