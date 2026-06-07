'use client'

import { useState, useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { leaveGroup } from '@/app/actions/leave-group'

type Props = {
  groupId: string
}

export default function LeaveGroupButton({
  groupId,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleLeave = () => {
    startTransition(async () => {
      try {
        await leaveGroup(groupId)

        window.location.href = '/spending-groups'
      } catch (err) {
        console.error(err)
        alert('No se pudo salir del grupo')
      }
    })
  }

  return (
    <>
      <div className="relative group w-full">
        <button
          onClick={() => setOpen(true)}
          className={`
            w-full flex items-center justify-center gap-2  rounded-2xl p-4 font-semibold hover:bg-red-500/20 transition-all bg-orange-500/20
          `}
        >
          <LogOut className="w-5 h-5" />

          <span>Salir del grupo</span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-3">
              Salir del grupo
            </h2>

            <p className="text-zinc-400 text-sm mb-6">
              ¿Estás seguro? Vas a dejar de participar
              en todos los gastos del grupo.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700"
              >
                Cancelar
              </button>

              <button
                disabled={pending}
                onClick={handleLeave}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500"
              >
                {pending ? 'Saliendo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}