'use client'

import { useState } from 'react'
import { Bell, Check } from 'lucide-react'

export function CopyReminderButton({ message }: { message: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      title="Copiar mensaje recordatorio"
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
        copied 
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
          : 'bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-blue-500/20 border border-transparent'
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
      <span>{copied ? 'Copiado' : 'Recordar'}</span>
    </button>
  )
}