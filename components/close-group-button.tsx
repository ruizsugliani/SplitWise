'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { closeGroup } from '@/app/actions/groups'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import ToastConfirm from '@/components/ui/toast-confirmation'

type CloseGroupButtonProps = {
  groupId: string
  isClosed: boolean
  isCreator: boolean
}

export function CloseGroupButton({ groupId, isClosed, isCreator }: CloseGroupButtonProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [toastMessage])

  useEffect(() => {
    if (!errorMessage) return
    const timer = setTimeout(() => setErrorMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [errorMessage])

  const handleCloseGroup = async () => {
    setIsClosing(true)
    setErrorMessage(null)
    const result = await closeGroup(groupId)

    if (result.success) {
      setToastMessage('Grupo cerrado correctamente')
      setIsConfirmOpen(false)
      router.refresh()
    } else {
      setErrorMessage(result.error || 'No se pudo cerrar el grupo')
    }

    setIsClosing(false)
  }

  const disabled = isClosed || !isCreator

  return (
    <>
      <button
        onClick={() => setIsConfirmOpen(true)}
        disabled={disabled}
        className="col-span-2 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 py-4 rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        title={
          isClosed
            ? 'Este grupo ya está cerrado'
            : !isCreator
              ? 'Solo el creador puede cerrar el grupo'
              : 'Cerrar grupo'
        }
      >
        <Lock className="w-5 h-5" />
        {isClosed ? 'Grupo cerrado' : 'Cerrar grupo'}
      </button>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Cerrar grupo"
        description={
          'Solo podrás cerrar el grupo cuando no haya deudas pendientes. Esta acción marca el grupo como cerrado.'
        }
        confirmText="Sí, cerrar"
        cancelText="Cancelar"
        isLoading={isClosing}
        onConfirm={handleCloseGroup}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {toastMessage && <ToastConfirm toastMessage={toastMessage} />}
      {errorMessage && (
        <div className="fixed bottom-10 left-1/2 z-70 -translate-x-1/2 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="flex items-center gap-2 rounded-2xl border border-red-500/40 bg-red-950 px-6 py-3 font-semibold text-red-100 shadow-2xl">
            <AlertTriangle className="h-5 w-5 text-red-300" />
            {errorMessage}
          </div>
        </div>
      )}
    </>
  )
}
