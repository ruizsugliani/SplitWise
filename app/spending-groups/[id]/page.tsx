import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, ReceiptText } from 'lucide-react'
import { AddMemberModal } from '@/components/add-member-modal'
import { MembersListModal } from '@/components/ui/members-list-modal' // NUEVO COMPONENTE
import Link from 'next/link'
import { AddExpenseModal } from '@/components/add-expense-modal'

export default async function SpendingGroupDashboardPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const supabase = await createClient()

  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

const { data: group, error } = await supabase
    .from('spending_groups')
    .select(`
      *,
      members: spending_group_members (
        id,
        member_name,
        profiles (
          id,
          full_name,
          avatar_url
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !group) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white">
        <p className="text-zinc-400 mb-4">Grupo no encontrado</p>
        <Link href="/spending-groups" className="text-blue-400 hover:underline">Volver al inicio</Link>
      </div>
    )
  }

  const membersList = group.members || []
  const memberCount = membersList.length

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      {/* Header de Navegación... (igual) */}
      <header className="max-w-2xl mx-auto flex items-center justify-between mb-8 pt-4">
        <Link href="/spending-groups" className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-4xl mb-2">{group.icon}</span>
          <h1 className="text-2xl font-bold">{group.name}</h1>
        </div>
        <div className="w-10" /> 
      </header>

      <main className="max-w-xl mx-auto">
        <div className="grid grid-cols-2 gap-4 mb-8">
            <AddMemberModal groupId={id} />
            
            {/* Reemplazamos tu div estático por el nuevo Modal interactivo */}
            <MembersListModal groupId={id} members={membersList} memberCount={memberCount} creatorId={group.created_by} />

            <AddExpenseModal members={membersList}/>
        </div>

        {/* Lista de Gastos... (igual) */}
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4 text-center md:text-left">
            Gastos recientes
          </h2>
          <div className="text-center py-12 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl">
            <p className="text-zinc-500 italic">Aún no se han registrado gastos. Comienza agregando alguno!</p>
          </div>
        </section>
      </main>
    </div>
  )
}