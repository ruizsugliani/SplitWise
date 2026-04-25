import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SpendingGroupCard } from '@/components/ui/spending-grop-card';
import { CreateGroupModal } from '@/components/create-group-modal';
import { LogoutButton } from '@/components/logout-button';
import { ProfileButton } from '@/components/profile-button';
import { ReopenGroupButton } from '@/components/reopen-group-button';

const currencyFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
})

export default async function SpendingGroupsPage() {
    const supabase = await createClient()
    
    // 1. Obtenemos la sesión del usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/auth/login')
    }

    // 2. Traemos los grupos donde el usuario es miembro
    // Usamos una consulta relacional para contar los miembros automáticamente
    const { data: groups, error: groupsError } = await supabase
    .from('spending_groups')
    .select(`
        id,
        name,
        icon,
        created_by,
        closed_at,
        spending_group_members(count),
        expenses (
            value
        )
    `)

    if (groupsError) {
        console.error("Error fetching groups:", groupsError)
    }

    const groupsWithTotals = (groups || []).map((group) => {
        const membersCount = group.spending_group_members?.[0]?.count || 0
        const expenses = group.expenses || []
        const expensesCount = expenses.length
        const totalAmount = expenses.reduce((acc: number, e: { value?: number | null }) => acc + Number(e.value || 0), 0)

        return {
            ...group,
            membersCount,
            expensesCount,
            totalAmount,
        }
    })

    const activeGroups = groupsWithTotals.filter((group) => !group.closed_at)
    const closedGroups = groupsWithTotals.filter((group) => Boolean(group.closed_at))

    return (
        <div className="min-h-screen bg-[#0a0a0a] p-6 text-white">
            <header className="max-w-2xl mx-auto text-center mb-10 pt-10">
                <h1 className="text-3xl font-bold tracking-tight">SplitWise</h1>
                <p className="text-zinc-400">Administra tus gastos en grupo</p>
            </header>

            <main className="max-w-xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
                        Grupos Activos
                    </h2>
                </div>

                <div className="space-y-4">
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
                        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                            <p className="text-zinc-500">No tienes grupos activos aún.</p>
                            <p className="text-zinc-600 text-sm">¡Crea uno con el botón +!</p>
                        </div>
                    )}
                </div>

                <div className="mt-10 mb-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                        Historial (Grupos Cerrados)
                    </h2>
                </div>

                <div className="space-y-4">
                    {closedGroups.length > 0 ? (
                        closedGroups.map((group) => (
                            <div
                                key={group.id}
                                className="flex items-center justify-between gap-4 mt-2 mb-2 p-4 bg-[#171717] rounded-2xl border border-white/10"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 flex items-center justify-center text-3xl bg-white/5 rounded-xl">
                                        {group.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight text-white">{group.name}</h3>
                                        <p className="text-sm text-zinc-400">
                                            {group.membersCount} miembros • {group.expensesCount} gastos
                                        </p>
                                        <p className="text-xs text-zinc-500 mt-1">
                                            Cerrado el {group.closed_at ? new Date(group.closed_at).toLocaleString('es-AR') : '-'}
                                        </p>
                                    </div>
                                </div>
                                <ReopenGroupButton groupId={group.id} canReopen={group.created_by === user.id} />
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 border border-dashed border-white/5 rounded-2xl">
                            <p className="text-zinc-500 text-sm">Todavía no hay grupos cerrados.</p>
                        </div>
                    )}
                </div>
                
                <LogoutButton />
                <ProfileButton />
                <CreateGroupModal />
            </main>
        </div>
    );
}
