import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SPENDING_GROUPS } from "@/data/features";
import { SpendingGroupCard } from '@/components/ui/spending-grop-card';

export default async function ExpensesPage() {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getClaims()

    if (error || !data?.claims) {
        redirect('/auth/login')
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] p-6 text-white">
        <header className="max-w-2xl mx-auto text-center mb-10 pt-10">
            <h1 className="text-3xl font-bold tracking-tight">SplitWise</h1>
            <p className="text-zinc-400">Manage your group expenses</p>
        </header>

        <main className="max-w-xl mx-auto">
            <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
                Active Groups
            </h2>
            </div>

            <div className="space-y-4">
            {SPENDING_GROUPS.map((group) => (
                <SpendingGroupCard 
                    key={group.id}
                    {...group}
                />
            ))}
            </div>

            {/* Botón Flotante (FAB) */}
            <button className="fixed bottom-8 right-8 w-14 h-14 bg-white text-black rounded-full shadow-2xl flex items-center justify-center text-3xl hover:scale-110 active:scale-95 transition-all">
            +
            </button>
        </main>
        </div>
    );
}