"use client"

import { useState } from 'react'
import { Receipt, Scale, Settings } from 'lucide-react'

export function GroupDashboardTabs({ 
  header,
  gastosSection, 
  balancesSection, 
  ajustesSection 
}: { 
  header: React.ReactNode
  gastosSection: React.ReactNode
  balancesSection: React.ReactNode
  ajustesSection: React.ReactNode
}) {
  const [activeTab, setActiveTab] = useState<'gastos' | 'balances' | 'ajustes'>('gastos')

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white">
      {/* 1. Header Fijo (Siempre visible) */}
      <div className="px-6 pt-4 pb-2">
        {header}
      </div>

      {/* 2. Barra de Navegación (Tabs) */}
      <div className="flex border-b border-white/10 px-6 mt-2">
        <button 
          onClick={() => setActiveTab('gastos')}
          className={`flex flex-1 items-center justify-center gap-2 pb-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'gastos' ? 'border-green-500 text-green-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Gastos
        </button>
        <button 
          onClick={() => setActiveTab('balances')}
          className={`flex flex-1 items-center justify-center gap-2 pb-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'balances' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Scale className="w-4 h-4" />
          Saldos
        </button>
        <button 
          onClick={() => setActiveTab('ajustes')}
          className={`flex flex-1 items-center justify-center gap-2 pb-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'ajustes' ? 'border-zinc-300 text-zinc-300' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Settings className="w-4 h-4" />
          Ajustes
        </button>
      </div>

      {/* 3. Contenido Dinámico con animación suave */}
      <main className="flex-1 p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* PESTAÑA: GASTOS */}
        {activeTab === 'gastos' && (
          <div className="space-y-6">
            {gastosSection}
          </div>
        )}

        {/* PESTAÑA: BALANCES */}
        {activeTab === 'balances' && (
          <div className="space-y-6">
            {balancesSection}
          </div>
        )}

        {/* PESTAÑA: AJUSTES */}
        {activeTab === 'ajustes' && (
          <div className="space-y-6">
            {ajustesSection}
          </div>
        )}

      </main>
    </div>
  )
}