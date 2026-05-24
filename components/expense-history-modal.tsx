"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { X, Calendar, User, Receipt, Trash2, Loader2 } from "lucide-react"
import { formatCurrency } from "@/app/types/currency"
import { removePayment } from "@/app/actions/payments"
import { useRouter } from "next/navigation"
import { ConfirmModal } from "./ui/confirm-modal"

interface Payment {
  id: string
  amount: number
  created_at: string
  expense_signer_id: string
  member_name: string
  observations: string | null
}

interface PaymentQueryResult {
  id: string
  amount: number
  created_at: string
  expense_signer_id: string
  observations: string | null
}

export function ExpenseHistory({ 
  expenseId, 
  currencyCode, 
  signerNames,
  onClose 
}: { 
  expenseId: string, 
  currencyCode: string, 
  signerNames: Record<string, string>,
  onClose: () => void 
}) {
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [toastMessage, setToastMessage] = useState<string | null>(null)
    const supabase = createClient()
    const router = useRouter()
    
    const handleDeletePayment = async () => {
        if (!paymentToDelete) return

        const paymentId = paymentToDelete.id
        setPaymentToDelete(null)
        setIsDeleting(paymentId)
        setDeletingId(paymentId)

        const result = await removePayment(paymentId)

        if (result.success) {
            setToastMessage("Gasto eliminado correctamente")
            setPayments(prev => prev.filter(p => p.id !== paymentId))
            router.refresh()
        } else {
            setToastMessage("No se pudo eliminar el pago")
        }
        setIsDeleting(null)
        setDeletingId(null)
    }

    useEffect(() => {
        if (toastMessage) {
        const timer = setTimeout(() => setToastMessage(null), 3000)
        return () => clearTimeout(timer)
        }
    }, [toastMessage])

    useEffect(() => {
        async function fetchHistory() {
        const { data, error } = await supabase
            .from('payments')
            .select(`
            id,
            amount,
            expense_signer_id,
            observations,
            created_at
            `)
            .in('expense_signer_id', Object.keys(signerNames))
            .order('created_at', { ascending: false })

        if (!error && data) {
            const formatted = (data as PaymentQueryResult[])
            .map((p) => {
                return {
                  id: p.id,
                  amount: p.amount,
                  expense_signer_id: p.expense_signer_id,
                  observations: p.observations,
                  created_at: p.created_at,
                  member_name: signerNames[p.expense_signer_id] ||
                    'Miembro'
                }
            })
            setPayments(formatted)
        }
        setLoading(false)
        }

        fetchHistory()
    }, [expenseId, signerNames, supabase])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Historial de Pagos</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">No hay pagos registrados aún.</p>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-start gap-4 group">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm text-white font-medium">
                      <User className="w-3 h-3 text-zinc-500" />
                      {payment.member_name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(payment.created_at).toLocaleDateString('es-ES', {
                        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                    {payment.observations && (
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">
                        {payment.observations}
                      </p>
                    )}
                  </div>
                  
                <div className="flex items-center gap-4 shrink-0">
                    <div className="text-emerald-400 font-bold">
                      {formatCurrency(payment.amount, currencyCode) + " " + currencyCode}
                    </div>
                    <button
                        onClick={() => {setPaymentToDelete(payment)}}
                        disabled={deletingId === payment.id}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        >
                        {deletingId === payment.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 bg-white/2 border-t border-white/5">
          <button 
            onClick={onClose}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-2xl transition-all"
          >
            Cerrar
          </button>
        </div>

        {paymentToDelete && (
          <ConfirmModal 
              isOpen={paymentToDelete !== null}
              title="¿Estás seguro?"
              description={
              <>
                  Vas a eliminar el pago realizado por <span className="text-white font-semibold">{paymentToDelete.member_name}</span> del día
                  <br />
                  <span className="text-white font-semibold">
                      {new Date(paymentToDelete.created_at).toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                  </span> 
                  <br />
                  por un monto de <span className="text-white font-semibold">{formatCurrency(paymentToDelete.amount, currencyCode) + " " + currencyCode}</span>.
                  <br />
                  Esta acción no se puede deshacer.
              </>
              }
              confirmText="Eliminar"
              isLoading={isDeleting === paymentToDelete.id}
              onConfirm={handleDeletePayment}
              onCancel={() => setPaymentToDelete(null)}
          />
        )}
      </div>
    </div>
  )
}
