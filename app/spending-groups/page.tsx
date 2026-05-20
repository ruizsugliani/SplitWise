import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SpendingGroupCard } from '@/components/ui/spending-grop-card';
import { CreateGroupModal } from '@/components/create-group-modal';
import { LogoutButton } from '@/components/logout-button';
import { ProfileButton } from '@/components/profile-button';
import { ReopenGroupButton } from '@/components/reopen-group-button';
import { Users, Archive } from 'lucide-react'; // <-- NUEVOS ICONOS

const currencyFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
})

export default async function SpendingGroupsPage() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) redirect('/auth/login')

    const { data: groups, error: groupsError } = await supabase
    .from('spending_groups')
    .select(`id, name, icon, created_by, closed_at, spending_group_members(count), expenses (value)`)

    if (groupsError) console.error("Error fetching groups:", groupsError)

    const groupsWithTotals = (groups || []).map((group) => {
        const membersCount = group.spending_group_members?.[0]?.count || 0
        const expenses = group.expenses || []
        const totalAmount = expenses.reduce((acc: number, e: { value?: number | null }) => acc + Number(e.value || 0), 0)
        return { ...group, membersCount, expensesCount: expenses.length, totalAmount }
    })

    const activeGroups = groupsWithTotals.filter((group) => !group.closed_at)
    const closedGroups = groupsWithTotals.filter((group) => Boolean(group.closed_at))

    return (
        <div className="min-h-screen bg-[#0a0a0a] p-6 text-white pb-32">
            <header className="max-w-2xl mx-auto text-center mb-10 pt-10">
                <h1 className="text-4xl font-bold tracking-tight bg-linear-to-br from-white to-zinc-400 bg-clip-text text-transparent mb-2">SplitWise</h1>
                <p className="text-zinc-500 font-medium">Administra tus gastos en grupo</p>
            </header>

            <main className="max-w-xl mx-auto space-y-10">
                {/* GRUPOS ACTIVOS */}
                <section>
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <Users className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                            Grupos Activos
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {activeGroups.length > 0 ? (
                            activeGroups.map((group) => (
                                <SpendingGroupCard
                                    key={group.id}
                                    id={group.id}
                                    name={group.name}
                                    icon={group.icon}
                                    members={group.membersCount}
                                    expenses_count={group.expensesCount}
                                    total_amount={currencyFormatter.format(group.totalAmount)}
                                />
                            ))
                        ) : (
                            <div className="text-center py-16 bg-zinc-900/30 border border-dashed border-white/10 rounded-3xl">
                                <p className="text-zinc-400">No tienes grupos activos aún.</p>
                                <p className="text-zinc-500 text-sm mt-1">¡Crea uno con el botón +!</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* GRUPOS CERRADOS */}
                <section>
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <Archive className="w-5 h-5 text-amber-500/80" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                            Historial
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {closedGroups.length > 0 ? (
                            closedGroups.map((group) => (
                                <div
                                    key={group.id}
                                    className="flex items-center justify-between gap-4 p-4 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors rounded-2xl border border-white/5"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 flex items-center justify-center text-2xl bg-black/50 border border-white/5 rounded-full shadow-inner">
                                            {group.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white">{group.name}</h3>
                                            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                                                <span>{group.membersCount} miembros</span>
                                                <span>•</span>
                                                <span>{group.expensesCount} gastos</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ReopenGroupButton groupId={group.id} canReopen={group.created_by === user.id} />
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 bg-zinc-900/20 border border-white/5 rounded-3xl">
                                <p className="text-zinc-600 text-sm">Todavía no hay grupos cerrados.</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
            {/* DOCK FLOTANTE DE NAVEGACIÓN */}
            <div className="fixed bottom-6 left-0 w-full px-6 flex justify-center z-40 pointer-events-none">
                {/* items-center asegura que los botones chicos y el grande se alineen al medio perfecto */}
                <div className="w-full max-w-xl flex items-center justify-between pointer-events-auto">
                    
                    {/* Botones secundarios agrupados a la izquierda */}
                    <div className="flex items-center gap-3">
                        <LogoutButton />
                        <ProfileButton />
                    </div>
                    
                    {/* Botón principal a la derecha */}
                    <CreateGroupModal />
                    
                </div>
            </div>
        </div>
    );
}