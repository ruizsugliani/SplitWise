"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { X, Calendar, User, Receipt, Trash2, Loader2, Paperclip, Pencil } from "lucide-react"
import { formatCurrency } from "@/app/types/currency"
import { removePayment, updatePayment } from "@/app/actions/payments"
import { useRouter } from "next/navigation"
import { ConfirmModal } from "./ui/confirm-modal"

interface Payment {
  id: string
  amount: number
  created_at: string
  paid_at: string | null
  //expense_signer_id: string
  member_name: string
  observations: string | null
  payment_method: string | null
  receipt_url: string | null
}

interface PaymentQueryResult {
  id: string
  amount: number
  created_at: string
  paid_at: string | null
  //expense_signer_id: string
  observations: string | null
  payment_method: string | null
  receipt_url: string | null
  debts: {
    id: string
    expense_id: string
    sgmc: {
      id: string
      member_name: string
    } | null
    sgmd: {
      id: string
      member_name: string
    } | null
  } | null
}

function toDisplayDate(dateValue: string) {
  return new Date(dateValue).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDateTimeLocalValue(dateValue: string) {
  const date = new Date(dateValue)
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function ViewReceiptButton({ path }: { path: string }) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleClick = async () => {
    setLoading(true)
    const { data, error } = await supabase.storage
      .from('payment-receipts')
      .createSignedUrl(path, 60)
    setLoading(false)
    if (!error && data) window.open(data.signedUrl, '_blank')
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title="Ver comprobante"
      className="text-zinc-400 hover:text-white transition disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
    </button>
  )
}

export function ExpenseHistory({ 
  expenseId, 
  currencyCode, 
  signerNames,
  groupPath,
  onClose 
}: { 
  expenseId: string, 
  currencyCode: string, 
  signerNames: Record<string, string>,
  groupPath: string,
  onClose: () => void 
}) {
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null)
    const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [isSavingEdit, setIsSavingEdit] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [editAmount, setEditAmount] = useState("")
    const [editDateTime, setEditDateTime] = useState("")
    const [toastMessage, setToastMessage] = useState<string | null>(null)
    const supabase = createClient()
    const router = useRouter()

    const fetchHistory = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('payments')
            .select(`
              id,
              amount,
              paid_at,
              observations,
              payment_method,
              receipt_url,
              created_at,
              debts!inner (
                id,
                expense_id,
                sgmc:spending_group_members!debts_creditor_member_id_fkey (
                  id,
                  member_name
                ),
                sgmd:spending_group_members!debts_debtor_member_id_fkey (
                  id,
                  member_name
                )
              )
            `)
            .eq('debts.expense_id', expenseId)
            .order('paid_at', { ascending: false })

        if (!error && data) {
            // Usamos 'unknown' como puente para que TypeScript permita el casteo
            const rawData = data as unknown as PaymentQueryResult[]

            const formatted = rawData.map((p) => {
                // A prueba de balas: Extraemos los objetos lidiando con arrays si Supabase los devuelve así
                const debtsObj = Array.isArray(p.debts) ? p.debts[0] : p.debts
                const sgmdObj = Array.isArray(debtsObj?.sgmd) ? debtsObj.sgmd[0] : debtsObj?.sgmd
                const sgmcObj = Array.isArray(debtsObj?.sgmc) ? debtsObj.sgmc[0] : debtsObj?.sgmc

                const debtorName = sgmdObj?.member_name || 'Desconocido'
                const creditorName = sgmcObj?.member_name || 'Desconocido'

                return {
                    id: p.id,
                    amount: p.amount,
                    paid_at: p.paid_at,
                    observations: p.observations,
                    payment_method: p.payment_method,
                    receipt_url: p.receipt_url,
                    created_at: p.created_at,
                    member_name: `${debtorName} ➔ ${creditorName}`
                }
            })
            
            setPayments(formatted)
        }

        setLoading(false)
    }, [expenseId, supabase])
    
    const handleDeletePayment = async () => {
        if (!paymentToDelete) return

        const paymentId = paymentToDelete.id
        setPaymentToDelete(null)
        setIsDeleting(paymentId)
        setDeletingId(paymentId)

        const result = await removePayment(paymentId, groupPath)

        if (result.success) {
            setToastMessage("Gasto eliminado correctamente")
            setPayments(prev => prev.filter(p => p.id !== paymentId))
            await fetchHistory()
            router.refresh()
        } else {
            alert(result.error || "No se pudo eliminar el pago")
            setToastMessage("No se pudo eliminar el pago")
        }
        setIsDeleting(null)
        setDeletingId(null)
    }

    const handleStartEdit = (payment: Payment) => {
        const effectiveDate = payment.paid_at || payment.created_at
        setPaymentToEdit(payment)
        setEditAmount(String(payment.amount))
        setEditDateTime(toDateTimeLocalValue(effectiveDate))
    }

    const handleSaveEdit = async () => {
        if (!paymentToEdit) return

        const parsedAmount = Number(editAmount)
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            alert("Ingresá un monto válido.")
            return
        }

        if (!editDateTime) {
            alert("Ingresá una fecha y hora válidas.")
            return
        }

        setIsSavingEdit(paymentToEdit.id)

        const paidAtIso = new Date(editDateTime).toISOString()
        const result = await updatePayment(paymentToEdit.id, {
            amount: parsedAmount,
            paidAt: paidAtIso,
        }, groupPath)

        if (result.success) {
            const updatedPayment = result.payment
            if (!updatedPayment) {
                alert("El pago no devolvio datos actualizados.")
                setToastMessage("No se pudo confirmar la edicion del pago")
                setIsSavingEdit(null)
                return
            }

            setPayments((prev) =>
                prev.map((payment) =>
                    payment.id === paymentToEdit.id
                        ? {
                            ...payment,
                            amount: updatedPayment.amount,
                            paid_at: updatedPayment.paid_at,
                          }
                        : payment
                )
            )
            await fetchHistory()
            setToastMessage("Pago editado correctamente")
            setPaymentToEdit(null)
            router.refresh()
        } else {
            alert(result.error || "No se pudo editar el pago")
            setToastMessage("No se pudo editar el pago")
        }

        setIsSavingEdit(null)
    }

    useEffect(() => {
        if (toastMessage) {
        const timer = setTimeout(() => setToastMessage(null), 3000)
        return () => clearTimeout(timer)
        }
    }, [toastMessage])

    useEffect(() => {
        const loadHistory = async () => {
            await fetchHistory()
        }

        void loadHistory()
    }, [fetchHistory])
    
    const handleDeletePayment = async () => {
        if (!paymentToDelete) return

        const paymentId = paymentToDelete.id
        setPaymentToDelete(null)
        setIsDeleting(paymentId)
        setDeletingId(paymentId)

        const result = await removePayment(paymentId, groupPath)

        if (result.success) {
            setToastMessage("Gasto eliminado correctamente")
            setPayments(prev => prev.filter(p => p.id !== paymentId))
            await fetchHistory()
            router.refresh()
        } else {
            alert(result.error || "No se pudo eliminar el pago")
            setToastMessage("No se pudo eliminar el pago")
        }
        setIsDeleting(null)
        setDeletingId(null)
    }

    const handleStartEdit = (payment: Payment) => {
        const effectiveDate = payment.paid_at || payment.created_at
        setPaymentToEdit(payment)
        setEditAmount(String(payment.amount))
        setEditDateTime(toDateTimeLocalValue(effectiveDate))
    }

    const handleSaveEdit = async () => {
        if (!paymentToEdit) return

        const parsedAmount = Number(editAmount)
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            alert("Ingresá un monto válido.")
            return
        }

        if (!editDateTime) {
            alert("Ingresá una fecha y hora válidas.")
            return
        }

        setIsSavingEdit(paymentToEdit.id)

        const paidAtIso = new Date(editDateTime).toISOString()
        const result = await updatePayment(paymentToEdit.id, {
            amount: parsedAmount,
            paidAt: paidAtIso,
        }, groupPath)

        if (result.success) {
            const updatedPayment = result.payment
            if (!updatedPayment) {
                alert("El pago no devolvio datos actualizados.")
                setToastMessage("No se pudo confirmar la edicion del pago")
                setIsSavingEdit(null)
                return
            }

            setPayments((prev) =>
                prev.map((payment) =>
                    payment.id === paymentToEdit.id
                        ? {
                            ...payment,
                            amount: updatedPayment.amount,
                            paid_at: updatedPayment.paid_at,
                          }
                        : payment
                )
            )
            await fetchHistory()
            setToastMessage("Pago editado correctamente")
            setPaymentToEdit(null)
            router.refresh()
        } else {
            alert(result.error || "No se pudo editar el pago")
            setToastMessage("No se pudo editar el pago")
        }

        setIsSavingEdit(null)
    }

    useEffect(() => {
        if (toastMessage) {
        const timer = setTimeout(() => setToastMessage(null), 3000)
        return () => clearTimeout(timer)
        }
    }, [toastMessage])

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
                    <div className="flex items-center gap-2 text-sm text-white font-medium flex-wrap">
                      <User className="w-3 h-3 text-zinc-500" />
                      {payment.member_name}
                      <div className="flex items-center gap-1.5">
                        {payment.payment_method && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                            {payment.payment_method}
                          </span>
                        )}
                        {payment.receipt_url && <ViewReceiptButton path={payment.receipt_url} />}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span className="whitespace-nowrap">
                        {toDisplayDate(payment.paid_at || payment.created_at)}
                      </span>
                    </div>
                    {payment.observations && (
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap wrap-break-word">
                        {payment.observations}
                      </p>
                    )}
                  </div>
                  
                <div className="flex items-center gap-2 shrink-0">
                    <div className="text-emerald-400 font-bold">
                      {formatCurrency(payment.amount, currencyCode) + " " + currencyCode}
                    </div>
                    <button
                        onClick={() => handleStartEdit(payment)}
                        disabled={Boolean(isSavingEdit)}
                        className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        title="Editar pago"
                        >
                        <Pencil className="w-4 h-4" />
                    </button>
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
                      {toDisplayDate(paymentToDelete.paid_at || paymentToDelete.created_at)}
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

        {paymentToEdit && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl max-w-sm w-full shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">Editar pago</h3>
                <button
                  onClick={() => setPaymentToEdit(null)}
                  disabled={Boolean(isSavingEdit)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Monto</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Fecha y hora</label>
                  <input
                    type="datetime-local"
                    value={editDateTime}
                    onChange={(e) => setEditDateTime(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setPaymentToEdit(null)}
                  disabled={Boolean(isSavingEdit)}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={Boolean(isSavingEdit)}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingEdit === paymentToEdit.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
