import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Wallet, HandCoins, ArrowRight, Users } from 'lucide-react'
import { AddMemberModal } from '@/components/add-member-modal'
import { CopyReminderButton } from '@/components/ui/copy-reminder-button'
import { MembersListModal } from '@/components/ui/members-list-modal'
import ExpensesClient from '@/components/expenses-client'
import { AddExpenseModal } from '@/components/add-expense-modal'
import { CloseGroupButton } from '@/components/close-group-button'
import Link from 'next/link'
import { formatCurrency } from '@/app/types/currency'
import { calculateGroupDebts } from '@/lib/utils/debt-calculator'
import { Member, MemberProfile } from '@/app/types/member'
import { ExpenseSigner, ExpenseWithSigners } from '@/app/types/expense'
import { EditGroupModal } from '@/components/edit-group-modal'
import { memberHasPendingDebt, getCurrentMember } from '@/lib/utils/pending-debt'
import LeaveGroupButton from '@/components/leave-group-button'
import { GroupDashboardTabs } from '@/components/ui/group-dashboard-tabs'

type GroupQuery = {
  id: string
  name: string
  icon: string
  created_by: string
  closed_at: string | null
  members: Member[]
  expenses: ExpenseWithSigners[]
}

export default async function SpendingGroupDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
    
  const { data: currenciesData, error: currenciesError } = await supabase.from('currencies').select('*');
  if (currenciesError) {
    console.error('Error fetching currencies', currenciesError);
  }
  const currencies = currenciesData || [];
  const defaultCurrencyId = currencies.find(c => c.code === 'ARS')?.id || currencies[0]?.id || '';

  const { data: group, error } = await supabase
    .from('spending_groups')
    .select(
      `
        id,
        name,
        icon,
        created_by,
        closed_at,
        members:spending_group_members (
          id,
          member_name,
          profile_id,
          profiles ( id, full_name, avatar_url, email )
        )
      `
    )
    .eq('id', id)
    .single()

  if (error || !group) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white">
        <p className="text-zinc-400 mb-4">Grupo no encontrado</p>
        <Link href="/spending-groups" className="text-blue-400 hover:underline">
          Volver al inicio
        </Link>
      </div>
    )
  }

  const baseGroup = group as unknown as GroupQuery
  if (baseGroup.closed_at) {
    redirect('/spending-groups')
  }

  const members = baseGroup.members || []
  const membersById = new Map(members.map((m) => [m.id, m]))

  const { data: expensesData, error: expensesError } = await supabase
    .from('expenses')
    .select(`
      id,
      description,
      value,
      created_at,
      paid_by,
      currency_id,
      spending_group_members!expendings_paid_by_fkey (
        member_name,
        profiles ( full_name )
      ),
      expense_signer!expense_signer_expense_id_fkey (
        id,
        spending_group_member_id,
        amount_due,
        payments ( amount ),
        spending_group_members (
          id,
          member_name,
          profile_id,
          profiles ( id, full_name, avatar_url, email )
        )
      )
    `)
    .eq('spending_group_id', id)

  if (expensesError) console.error('Error fetching expenses', expensesError)

  const calcExpenses: ExpenseWithSigners[] = (expensesData || []).map((raw) => {
    const e = raw as Record<string, unknown>
    const signersRaw = Array.isArray(e.expense_signer) ? (e.expense_signer as unknown[]) : []

    const payerRaw = e.spending_group_members;
    const payerObj = Array.isArray(payerRaw) 
      ? payerRaw[0] 
      : (payerRaw as { member_name?: string; profiles?: { full_name?: string } } | null);
      
    const paidByName = payerObj?.member_name || payerObj?.profiles?.full_name || 'Desconocido';

    const normalizeMember = (m: unknown): Member | null => {
      if (!m) return null
      const candidate = Array.isArray(m) ? (m[0] as Record<string, unknown> | undefined) : (m as Record<string, unknown>)
      if (!candidate) return null
      const profilesRaw = candidate.profiles
      const profileObj = Array.isArray(profilesRaw)
        ? (profilesRaw[0] as Record<string, unknown> | undefined)
        : (profilesRaw as Record<string, unknown> | undefined)

      const profile: MemberProfile | null = profileObj
        ? {
            id: String(profileObj.id ?? ''),
            full_name: (profileObj.full_name as string | null | undefined) ?? null,
            avatar_url: (profileObj.avatar_url as string | null | undefined) ?? null,
            email: (profileObj.email as string | null | undefined) ?? null,
          }
        : null

      return {
        id: String(candidate.id ?? ''),
        member_name: String(candidate.member_name ?? ''),
        profile_id: (candidate.profile_id as string | null | undefined) ?? null,
        profiles: profile,
      }
    }

    const expenseSigner: ExpenseSigner[] = signersRaw.map((esRaw) => {
      const es = esRaw as { 
        id?: string; 
        spending_group_member_id?: string; 
        spending_group_members?: unknown; 
        amount_due?: number; 
        payments?: { amount?: number | string }[] 
      };
      
      const payments = Array.isArray(es.payments) ? es.payments : [];
      const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      return {
        id: String(es.id ?? ''),
        spending_group_member_id: String(es.spending_group_member_id ?? ''),
        spending_group_members: normalizeMember(es.spending_group_members),
        amount_due: Number(es.amount_due ?? 0),
        total_paid: totalPaid,
      }
    })

    return {
      id: String(e.id ?? ''),
      description: (e.description as string | undefined) ?? '',
      created_at: (e.created_at as string | undefined) ?? '',
      paid_by: String(e.paid_by ?? ''),
      paid_by_member_name: paidByName,
      value: Number(e.value ?? 0),
      split_between: signersRaw.length || 0,
      expense_signer: expenseSigner,
      currency_id: String(e.currency_id || defaultCurrencyId),
    }
  })

  const expensesForClient = calcExpenses.map((e) => ({
    ...e,
    currentUserSigner: e.expense_signer.find(
      (s) => s.spending_group_members?.profile_id === user.id
    ) || null
  })) as ExpenseWithSigners[];

  const { 
    totalsByCurrency, 
    balancesByCurrency, 
    settlements 
  } = calculateGroupDebts(calcExpenses, members, currencies);

  const getCurrencyCode = (id: string) => currencies.find(c => c.id === id)?.code || 'ARS';

  const memberDisplay = (memberId: string) => {
    const member = membersById.get(memberId)
    return member?.profiles?.full_name || member?.member_name || 'Miembro'
  }
  
  const isCreator = user.id === baseGroup.created_by;
  const currentMember = getCurrentMember(members, user.id);
  const hasPendingDebt = currentMember ? memberHasPendingDebt(calcExpenses, currentMember.id) : false;
  const canLeaveGroup = !isCreator && !hasPendingDebt && !!currentMember;

  // ==========================================
  // RENDERIZADO DEL NUEVO LAYOUT POR PESTAÑAS
  // ==========================================
  return (
    <GroupDashboardTabs 
      // ----------------- HEADER -----------------
      header={
        <header className="max-w-2xl mx-auto grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex justify-start">
            <Link
              href="/spending-groups"
              className="p-2 hover:bg-zinc-900 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-4xl mb-2">{baseGroup.icon}</span>
            <h1 className="text-2xl font-bold">{baseGroup.name}</h1>
          </div>
          <div className="flex justify-end">
            {isCreator && (
              <EditGroupModal 
                groupId={id} 
                initialName={group.name} 
                initialIcon={group.icon} 
              />
            )}
          </div>
        </header>
      }

      // ----------------- PESTAÑA: GASTOS -----------------
      gastosSection={
        <>
          <div className="w-full mb-2">
            <AddExpenseModal groupId={id} members={members} currencies={currencies} />
          </div>

          <section className="rounded-3xl border border-white/10 bg-white/3 p-5 flex flex-col gap-2 h-fit">
            <p className="text-sm text-zinc-400">Total gastado</p>
            <div className="flex flex-col gap-1">
              {Object.entries(totalsByCurrency).map(([currId, total]) => (
                <p key={currId} className="text-3xl font-bold">
                  {formatCurrency(total, getCurrencyCode(currId))}
                </p>
              ))}
              {Object.keys(totalsByCurrency).length === 0 && (
                <p className="text-3xl font-bold">$0.00</p>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              ({calcExpenses.length} gasto{calcExpenses.length === 1 ? '' : 's'})
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-green-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Gastos recientes</h2>
            </div>
            <ExpensesClient 
              groupId={id} 
              members={members} 
              expenses={expensesForClient} 
              currencies={currencies}
            />
          </section>
        </>
      }

      // ----------------- PESTAÑA: BALANCES -----------------
      balancesSection={
        <div className="flex flex-col gap-6">
          {/* 1. BALANCES INDIVIDUALES */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4 px-1">
              Estado de cuenta
            </h2>
            <div className="grid gap-3">
              {members.map((m) => {
                const userBalances = balancesByCurrency[m.id] || {};
                const activeCurrencies = Object.entries(userBalances).filter(([, val]) => Math.abs(val) > 0.01);
                const displayName = m.profiles?.full_name || m.member_name;
                const initial = displayName.charAt(0).toUpperCase();

                return (
                  <div key={m.id} className="flex items-center justify-between bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors p-4 rounded-2xl border border-white/5">
                    {/* Izquierda: Avatar y Nombre */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-linear-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-white font-bold shadow-inner">
                        {initial}
                      </div>
                      <span className="font-medium text-white text-base">
                        {displayName}
                      </span>
                    </div>

                    {/* Derecha: Etiquetas de saldo */}
                    <div className="flex flex-col items-end gap-1.5">
                      {activeCurrencies.length === 0 ? (
                        <span className="text-sm text-zinc-500 bg-zinc-800/50 px-3 py-1 rounded-full">Al día</span>
                      ) : (
                        activeCurrencies.map(([currId, balance]) => {
                          const positive = balance >= 0;
                          return (
                            <div 
                              key={currId} 
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                                positive 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}
                            >
                              <span className="opacity-70">{getCurrencyCode(currId)}</span>
                              <span>{formatCurrency(Math.abs(balance), getCurrencyCode(currId))}</span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* 2. TRANSFERENCIAS SUGERIDAS (DEUDAS) */}
          <section>
            <div className="flex items-center gap-2 mb-4 px-1">
              <HandCoins className="w-5 h-5 text-blue-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Cómo saldar cuentas
              </h2>
            </div>
            
            {settlements.length === 0 ? (
              <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 text-center">
                <p className="text-zinc-500 text-sm">¡Excelente! Todas las cuentas están saldadas.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {settlements.map((s, idx) => {
                  const debtorName = memberDisplay(s.from)
                  const creditorName = memberDisplay(s.to)
                  const formattedAmount = formatCurrency(s.amount, getCurrencyCode(s.currency_id));
                  const reminderMessage = `Hola ${debtorName}, te recuerdo que le debés ${formattedAmount} a ${creditorName} en el grupo ${baseGroup.name} 💸`
                  
                  return (
                    <div
                      key={`${s.from}-${s.to}-${s.currency_id}-${idx}`}
                      className="relative overflow-hidden flex items-center justify-between bg-linear-to-r from-zinc-900/80 to-zinc-900/40 p-4 rounded-2xl border border-white/5"
                    >
                      {/* Línea lateral de color para indicar que es una deuda */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500/50"></div>

                      <div className="flex flex-col gap-3 w-full pl-2">
                        {/* Flujo visual: Deudor -> Acreedor */}
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                              {debtorName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-zinc-300 font-medium truncate max-w-22.5">{debtorName}</span>
                          </div>
                          
                          <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0" />
                          
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-500">
                              {creditorName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-emerald-400 font-medium truncate max-w-22.5">{creditorName}</span>
                          </div>
                        </div>

                        {/* Monto y Acción */}
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold text-white tracking-tight">
                            {formattedAmount}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <CopyReminderButton message={reminderMessage} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      }

      // ----------------- PESTAÑA: AJUSTES -----------------
      ajustesSection={
        <div className="flex flex-col gap-6">
          
          {/* TARJETA 1: GESTIÓN DE MIEMBROS */}
          <section>
            <div className="flex items-center gap-2 mb-3 px-1">
              <Users className="w-5 h-5 text-zinc-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Gestión de Miembros
              </h2>
            </div>
            
            {/* Usamos flex-col para móvil y grid de 2 columnas para pantallas más grandes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AddMemberModal groupId={id} />
              <MembersListModal
                groupId={id}
                members={members}
                memberCount={members.length}
                creatorId={baseGroup.created_by}
              />
            </div>
          </section>

          {/* TARJETA 2: ZONA DE PELIGRO */}
          <section>
            {/* Contenedor con fondo rojo muy sutil para agrupar acciones destructivas */}
            <div className="flex flex-col gap-3 bg-red-500/5 border border-red-500/10 rounded-3xl p-4">
              <CloseGroupButton 
                groupId={id} 
                isClosed={false} 
                isCreator={isCreator} 
                hasPendingDebts={settlements.length > 0}
              />
              
              {!isCreator && (
                <LeaveGroupButton
                  groupId={id}
                  disabled={!canLeaveGroup}
                  debtMessage={
                    hasPendingDebt
                      ? 'No podés salir porque todavía debés dinero.'
                      : undefined
                  }
                />
              )}
            </div>
          </section>
          
        </div>
      }
    />
  )
}