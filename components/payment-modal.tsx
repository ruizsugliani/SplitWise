'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Banknote } from 'lucide-react'

// Definimos un tipo para la información que necesitamos de cada involucrado
export interface SignerOption {
  id: string;         // El ID en la tabla expense_signer
  name: string;
  amountDue: number;
  totalPaid: number;
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  signers: SignerOption[] // Los miembros involucrados en este gasto
}

export function PaymentModal({ isOpen, onClose, signers }: PaymentModalProps) {
  const [amount, setAmount] = useState('')
  const [selectedSignerId, setSelectedSignerId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()

  // Cuando se abre el modal, seleccionamos por defecto al primer miembro de la lista
  // y limpiamos el monto.
  useEffect(() => {
    if (isOpen && signers.length > 0) {
      setSelectedSignerId(signers[0].id)
      setAmount('')
    }
  }, [isOpen, signers])

  // Buscamos al miembro seleccionado para calcular su deuda dinámicamente
  const selectedSigner = signers.find(s => s.id === selectedSignerId)
  const remainingDebt = selectedSigner ? selectedSigner.amountDue - selectedSigner.totalPaid : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const paymentAmount = parseFloat(amount)

    if (isNaN(paymentAmount) || paymentAmount <= 0) return
    
    if (!selectedSignerId) {
      alert("Por favor selecciona un miembro al cual asignarle el pago.")
      return
    }

    if (paymentAmount > remainingDebt) {
      alert(`El pago no puede exceder el monto adeudado ($${remainingDebt.toFixed(2)})`)
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          expense_signer_id: selectedSignerId,
          amount: paymentAmount
        })

      if (error) throw error

      router.refresh()
      onClose()
    } catch (error) {
      console.error("Error al registrar el pago:", error)
      alert("Error al procesar el pago")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white text-black w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Banknote className="w-5 h-5 text-green-600" />
          Registrar pago
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* NUEVO: Selector de Miembro */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Pagar a nombre de</label>
            <select
              value={selectedSignerId}
              onChange={(e) => setSelectedSignerId(e.target.value)}
              className="w-full bg-zinc-100 border-none rounded-xl p-3 focus:ring-2 focus:ring-green-500 outline-none text-base"
            >
              {signers.map((signer) => {
                const isPaidOff = (signer.amountDue - signer.totalPaid) <= 0.01;
                return (
                  <option key={signer.id} value={signer.id} disabled={isPaidOff}>
                    {signer.name} {isPaidOff ? '(Saldado)' : ''}
                  </option>
                )
              })}
            </select>
          </div>

          <div className="bg-zinc-100 p-4 rounded-xl">
            <p className="text-sm text-zinc-600">Deuda pendiente</p>
            <p className="text-2xl font-bold text-green-600">
              ${remainingDebt > 0 ? remainingDebt.toFixed(2) : '0.00'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Monto a pagar ($)</label>
            <input
              type="number"
              step="0.01"
              max={remainingDebt > 0 ? remainingDebt : 0} // Restringimos el input nativo
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-100 border-none rounded-xl p-4 focus:ring-2 focus:ring-green-500 outline-none text-xl"
              required
              disabled={remainingDebt <= 0} // Deshabilitar si ya no hay deuda
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              disabled={loading || !amount || remainingDebt <= 0}
              className="flex-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition disabled:opacity-50"
            >
              {loading ? "Procesando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}