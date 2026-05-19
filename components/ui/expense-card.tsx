"use client"

import { Expense, ExpenseProps } from "@/app/types/expense";
import { MoreVertical, Edit2, Trash2, Wallet, CheckCircle2, AlertCircle, Receipt } from "lucide-react";
import { useEffect, useState, useRef } from 'react'
import { ConfirmModal } from "./confirm-modal";
import { useRouter } from 'next/navigation'
import { removeExpense } from "@/app/actions/expenses";
import ToastConfirm from "./toast-confirmation";
import { AddExpenseModal } from "../add-expense-modal";
import { ExpenseHistory } from "../expense-history-modal";
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
  groupId, 
  members, 
  currencies 
}: ExpenseProps) {
  const [isLookingAtExpenseHistory, setIsLookingAtExpenseHistory] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const router = useRouter()
  const expenseCurrency = currencies.find(c => c.id === expense.currency_id);
  const currencyCode = expenseCurrency?.code || 'ARS';const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            <p className="font-semibold text-lg">
              {formatCurrency(expense.value, currencyCode)}
            </p>
          </div>

          {/* Menú de acciones (Tres puntitos) */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown Flotante */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#1a1a1a] border border-white/10 shadow-2xl overflow-hidden z-10 py-1 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => setIsLookingAtExpenseHistory(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5 hover:text-emerald-400 transition-colors"
                >
                  <Receipt className="w-4 h-4"/>
                  Historial
                </button>

                {!isFullyPaid && (
                <button
                  onClick={() => setIsPaymentOpen(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5 hover:text-emerald-400 transition-colors"
                >
                  <Wallet className="w-4 h-4" />
                  Registrar pago
                </button>
              )}

                <button
                  onClick={() => { setIsEditing(true); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5 hover:text-blue-400 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar gasto
                </button>
                
                <div className="h-px bg-white/5 my-1 mx-2" />
                
                <button
                  onClick={() => { setExpenseToDelete(expense); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar gasto
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t my-3 border-white/5" />

      <div className="flex justify-between text-sm text-gray-500">
        <span>Dividido entre {expense.split_between} personas</span>
        <span>{formatDate(expense.created_at)}</span>
      </div>


      <PaymentModal 
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        signers={signersOptions}
      />

      {isLookingAtExpenseHistory && (
        <ExpenseHistory 
          expenseId={expense.id}
          currencyCode={currencyCode}
          onClose={() => setIsLookingAtExpenseHistory(false)}
        />
      )}

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

      {isEditing && (
        <AddExpenseModal 
          groupId={groupId} // Ajustado para tomar el ID del gasto
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

      {toastMessage && <ToastConfirm toastMessage={toastMessage} />}
    </div>
  );
}
