import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SpendingGroupCard } from '@/components/ui/spending-grop-card';
import { CreateGroupModal } from '@/components/create-group-modal';
import { LogoutButton } from '@/components/logout-button';

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
        spending_group_members(count)
    `)

    if (groupsError) {
        console.error("Error fetching groups:", groupsError)
    }

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
                    {groups && groups.length > 0 ? (
                        groups.map((group) => (
                            <SpendingGroupCard 
                                key={group.id}
                                id={group.id}
                                name={group.name}
                                icon={group.icon}
                                members={group.spending_group_members[0]?.count || 0}
                                expenses_count={0}
                                total_amount="$ 0.00"
                            />
                        ))
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                            <p className="text-zinc-500">No tienes grupos activos aún.</p>
                            <p className="text-zinc-600 text-sm">¡Crea uno con el botón +!</p>
                        </div>
                    )}
                </div>
                
                <LogoutButton />
                <CreateGroupModal />
            </main>
        </div>
    );
}