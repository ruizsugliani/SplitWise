'use client'

import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { reopenGroup } from '@/app/actions/groups'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import ToastConfirm from '@/components/ui/toast-confirmation'

type ReopenGroupButtonProps = {
  groupId: string
  canReopen: boolean
}

export function ReopenGroupButton({ groupId, canReopen }: ReopenGroupButtonProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isReopening, setIsReopening] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [toastMessage])

  const handleReopen = async () => {
    setIsReopening(true)
    const result = await reopenGroup(groupId)

    if (result.success) {
      setToastMessage('Grupo reabierto correctamente')
      setIsConfirmOpen(false)
      router.refresh()
    } else {
      alert(result.error || 'No se pudo reabrir el grupo')
    }

    setIsReopening(false)
  }

  return (
    <>
      <button
        onClick={() => setIsConfirmOpen(true)}
        disabled={!canReopen}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        title={canReopen ? 'Volver a abrir grupo' : 'Solo el creador puede reabrir el grupo'}
      >
        <RotateCcw className="h-4 w-4" />
        Volver a abrir
      </button>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Reabrir grupo"
        description="El grupo volverá a estar activo y podrás agregar miembros y gastos nuevamente."
        confirmText="Sí, reabrir"
        cancelText="Cancelar"
        isLoading={isReopening}
        onConfirm={handleReopen}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {toastMessage && <ToastConfirm toastMessage={toastMessage} />}
    </>
  )
}
