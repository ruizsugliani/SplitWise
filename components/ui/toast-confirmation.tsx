"use client"

import type { ReactNode } from "react"
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react"

type ToastType = "success" | "error" | "info"

interface ToastConfirmProps {
  toastMessage?: string
  type?: ToastType
}

const TOAST_STYLES: Record<ToastType, { wrapper: string; icon: ReactNode }> = {
  success: {
    wrapper: "border-emerald-400/20 bg-emerald-400/10 text-emerald-50",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-300" />,
  },
  error: {
    wrapper: "border-rose-400/20 bg-rose-400/10 text-rose-50",
    icon: <AlertTriangle className="w-5 h-5 text-rose-300" />,
  },
  info: {
    wrapper: "border-sky-400/20 bg-sky-400/10 text-sky-50",
    icon: <Info className="w-5 h-5 text-sky-300" />,
  },
}

export default function ToastConfirm({ toastMessage, type = "success" }: ToastConfirmProps) {
  if (!toastMessage) return null

  const styles = TOAST_STYLES[type]

  return (
    <div className="fixed bottom-6 left-1/2 z-70 w-[min(92vw,28rem)] -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className={`rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md ${styles.wrapper}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">{styles.icon}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-5">{toastMessage}</p>
          </div>
          <div className="rounded-full bg-white/10 p-1 text-current/70">
            <X className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  )
}
