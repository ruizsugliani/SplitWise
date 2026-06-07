"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  History,
  Loader2,
  Paperclip,
  Pencil,
  Receipt,
  Scale,
  Trash2,
  User,
  X,
} from "lucide-react"
import { formatCurrency } from "@/app/types/currency"
import { removePayment } from "@/app/actions/payments"
import { useRouter } from "next/navigation"
import { ConfirmModal } from "./ui/confirm-modal"

interface Payment {
  id: string
  amount: number
  created_at: string
  paid_at: string | null
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

type ExpenseHistoryRow = Record<string, unknown> & {
  id?: string | number
  expense_id?: string
}

type TimelineEntry =
  | {
      id: string
      kind: "payment"
      title: string
      date: string
      amount: number
      note: string | null
      payment: Payment
    }
  | {
      id: string
      kind: "debt" | "adjustment" | "history"
      title: string
      date: string
      amount: number | null
      note: string | null
      actor: string | null
    }

const DATE_FIELDS = ["date", "created_at", "updated_at", "modified_at", "inserted_at"]
const AMOUNT_FIELDS = ["amount", "delta", "difference", "adjustment_amount", "value_delta"]
const PREVIOUS_AMOUNT_FIELDS = [
  "old_value",
  "previous_value",
  "previous_amount",
  "old_amount",
  "amount_before",
  "value_before",
]
const NEXT_AMOUNT_FIELDS = [
  "new_value",
  "current_value",
  "new_amount",
  "amount_after",
  "value_after",
  "value",
]
const TYPE_FIELDS = ["movement_type", "type", "event_type", "action"]
const NOTE_FIELDS = ["description", "observations", "note", "comment", "reason"]
const ACTOR_FIELDS = [
  "modified_by_name",
  "created_by_name",
  "member_name",
  "user_name",
  "profile_name",
  "email",
]

function toDisplayDate(dateValue: string) {
  return new Date(dateValue).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function toDateTimeLocalValue(dateValue: string) {
  const date = new Date(dateValue)
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function getString(row: ExpenseHistoryRow, fields: string[]) {
  for (const field of fields) {
    const value = row[field]
    if (typeof value === "string" && value.trim()) return value
  }
  return null
}

function getNumber(row: ExpenseHistoryRow, fields: string[]) {
  for (const field of fields) {
    const value = row[field]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function getTimelineDate(row: ExpenseHistoryRow) {
  return getString(row, DATE_FIELDS) ?? new Date().toISOString()
}

function getHistoryAmount(row: ExpenseHistoryRow) {
  const directAmount = getNumber(row, AMOUNT_FIELDS)
  if (directAmount !== null) return directAmount

  const previousAmount = getNumber(row, PREVIOUS_AMOUNT_FIELDS)
  const nextAmount = getNumber(row, NEXT_AMOUNT_FIELDS)
  if (previousAmount !== null && nextAmount !== null) return nextAmount - previousAmount
  if (previousAmount === 0 && nextAmount !== null) return nextAmount

  return null
}

function getHistoryKind(row: ExpenseHistoryRow): "debt" | "adjustment" | "history" {
  const movementType = getString(row, TYPE_FIELDS)?.toLowerCase() ?? ""
  if (
    movementType.includes("debt") ||
    movementType.includes("deuda") ||
    movementType.includes("initial") ||
    movementType.includes("inicial")
  ) {
    return "debt"
  }
  if (movementType.includes("adjust") || movementType.includes("ajuste")) {
    return "adjustment"
  }

  const previousAmount = getNumber(row, PREVIOUS_AMOUNT_FIELDS)
  const nextAmount = getNumber(row, NEXT_AMOUNT_FIELDS)
  if (previousAmount === 0 && nextAmount !== null && nextAmount > 0) return "debt"
  if (previousAmount !== null && nextAmount !== null && previousAmount !== nextAmount) {
    return "adjustment"
  }

  return "history"
}

function toHistoryEntry(row: ExpenseHistoryRow, index: number): TimelineEntry {
  const kind = getHistoryKind(row)
  const amount = getHistoryAmount(row)
  const note = getString(row, NOTE_FIELDS)
  const actor = getString(row, ACTOR_FIELDS)
  const id = row.id ? String(row.id) : `${row.expense_id ?? "expense"}-${index}`

  const title =
    kind === "debt"
      ? "Deuda inicial"
      : kind === "adjustment"
        ? "Ajuste de gasto"
        : "Movimiento de gasto"

  return {
    id: `history-${id}`,
    kind,
    title,
    date: getTimelineDate(row),
    amount,
    note,
    actor,
  }
}

function formatSignedAmount(amount: number | null, currencyCode: string, kind: TimelineEntry["kind"]) {
  if (amount === null) return null

  const absoluteValue = Math.abs(amount)
  const formatted = `${formatCurrency(absoluteValue, currencyCode)} ${currencyCode}`
  if (kind === "payment" || kind === "debt") return formatted
  if (amount > 0) return `+${formatted}`
  if (amount < 0) return `-${formatted}`
  return formatted
}

function sortTimeline(entries: TimelineEntry[]) {
  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function ViewReceiptButton({ path }: { path: string }) {
  const [loading, setLoading] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const handleClick = async () => {
    setLoading(true)
    const { data, error } = await supabase.storage
      .from("payment-receipts")
      .createSignedUrl(path, 60)
    setLoading(false)
    if (!error && data) window.open(data.signedUrl, "_blank")
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
  groupPath,
  onClose,
}: {
  expenseId: string
  currencyCode: string
  groupPath: string
  onClose: () => void
}) {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null)
  const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState("")
  const [editDateTime, setEditDateTime] = useState("")
  const [editObservations, setEditObservations] = useState("")
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setHistoryError(null)

    const [paymentsResult, expenseHistoryResult] = await Promise.all([
      supabase
        .from("payments")
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
        .eq("debts.expense_id", expenseId),
      supabase
        .from("expense_history")
        .select("*")
        .eq("expense_id", expenseId),
    ])

    const entries: TimelineEntry[] = []

    if (!paymentsResult.error && paymentsResult.data) {
      const rawData = paymentsResult.data as unknown as PaymentQueryResult[]

      rawData.forEach((p) => {
        const debtsObj = Array.isArray(p.debts) ? p.debts[0] : p.debts
        const sgmdObj = Array.isArray(debtsObj?.sgmd) ? debtsObj.sgmd[0] : debtsObj?.sgmd
        const sgmcObj = Array.isArray(debtsObj?.sgmc) ? debtsObj.sgmc[0] : debtsObj?.sgmc

        const debtorName = sgmdObj?.member_name || "Desconocido"
        const creditorName = sgmcObj?.member_name || "Desconocido"
        const payment = {
          id: p.id,
          amount: Number(p.amount),
          paid_at: p.paid_at,
          observations: p.observations,
          payment_method: p.payment_method,
          receipt_url: p.receipt_url,
          created_at: p.created_at,
          member_name: `${debtorName} -> ${creditorName}`,
        }

        entries.push({
          id: `payment-${p.id}`,
          kind: "payment",
          title: "Pago",
          date: p.paid_at || p.created_at,
          amount: Number(p.amount),
          note: p.observations,
          payment,
        })
      })
    }

    if (paymentsResult.error) {
      setHistoryError(`No se pudieron cargar los pagos: ${paymentsResult.error.message}`)
    }

    if (!expenseHistoryResult.error && expenseHistoryResult.data) {
      const historyRows = expenseHistoryResult.data as ExpenseHistoryRow[]
      historyRows.forEach((row, index) => entries.push(toHistoryEntry(row, index)))
    }

    if (expenseHistoryResult.error) {
      setHistoryError((current) =>
        current
          ? `${current} ${expenseHistoryResult.error.message}`
          : `No se pudo cargar el historial de ajustes: ${expenseHistoryResult.error.message}`
      )
    }

    setTimeline(sortTimeline(entries))
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
      setToastMessage("Pago eliminado correctamente")
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
    setEditObservations(payment.observations || "")
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
    const { error } = await supabase
      .from("payments")
      .update({
        amount: parsedAmount,
        paid_at: paidAtIso,
        observations: editObservations.trim() || null,
      })
      .eq("id", paymentToEdit.id)

    if (!error) {
      await fetchHistory()
      setToastMessage("Pago editado correctamente")
      setPaymentToEdit(null)
      router.refresh()
    } else {
      console.error("Error al editar el pago:", error)
      alert(error.message || "No se pudo editar el pago")
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Historial</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {historyError && (
            <p className="mb-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
              {historyError}
            </p>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
            </div>
          ) : timeline.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">No hay movimientos registrados aún.</p>
          ) : (
            <div className="space-y-4">
              {timeline.map((entry) => {
                const amountLabel = formatSignedAmount(entry.amount, currencyCode, entry.kind)
                const icon =
                  entry.kind === "payment" ? (
                    <Receipt className="w-4 h-4 text-emerald-400" />
                  ) : entry.kind === "debt" ? (
                    <Scale className="w-4 h-4 text-blue-400" />
                  ) : entry.amount !== null && entry.amount < 0 ? (
                    <ArrowDownRight className="w-4 h-4 text-rose-400" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-amber-400" />
                  )
                const amountColor =
                  entry.kind === "payment"
                    ? "text-emerald-400"
                    : entry.kind === "debt"
                      ? "text-blue-300"
                      : entry.amount !== null && entry.amount < 0
                        ? "text-rose-300"
                        : "text-amber-300"

                return (
                  <div key={entry.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-start gap-4 group">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm text-white font-medium flex-wrap">
                        {icon}
                        <span>{entry.title}</span>
                        {entry.kind === "payment" && entry.payment.payment_method && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                            {entry.payment.payment_method}
                          </span>
                        )}
                        {entry.kind === "payment" && entry.payment.receipt_url && (
                          <ViewReceiptButton path={entry.payment.receipt_url} />
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <User className="w-3 h-3 text-zinc-500" />
                        <span className="truncate">
                          {entry.kind === "payment" ? entry.payment.member_name : entry.actor || "Sistema"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span className="whitespace-nowrap">{toDisplayDate(entry.date)}</span>
                      </div>

                      {entry.note && (
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap wrap-break-word">
                          {entry.note}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {amountLabel && (
                        <div className={`${amountColor} font-bold whitespace-nowrap`}>
                          {amountLabel}
                        </div>
                      )}

                      {entry.kind === "payment" && (
                        <>
                          <button
                            onClick={() => handleStartEdit(entry.payment)}
                            disabled={Boolean(isSavingEdit)}
                            className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            title="Editar pago"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setPaymentToDelete(entry.payment) }}
                            disabled={deletingId === entry.payment.id}
                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            title="Eliminar pago"
                          >
                            {deletingId === entry.payment.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
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
                  por un monto de <span className="text-white font-semibold">{formatCurrency(paymentToDelete.amount, currencyCode)}</span>.
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

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Observaciones</label>
                  <textarea
                    value={editObservations}
                    onChange={(e) => setEditObservations(e.target.value)}
                    placeholder="Opcional: transferencia parcial, comprobante, nota..."
                    className="w-full min-h-24 resize-none bg-zinc-950 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    maxLength={280}
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
