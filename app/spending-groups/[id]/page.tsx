import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Wallet, HandCoins } from 'lucide-react'
import { AddMemberModal } from '@/components/add-member-modal'
import { MembersListModal } from '@/components/ui/members-list-modal'
import ExpensesClient from '@/components/expenses-client'
import { AddExpenseModal } from '@/components/add-expense-modal'
import Link from 'next/link'
import type { Expense as BaseExpense } from '@/app/types/expense'
import { formatCurrency } from '@/app/types/currency'

type MemberProfile = {
  id: string
  full_name: string | null
  avatar_url: string | null
}

type Member = {
  id: string
  member_name: string
  profile_id: string | null
  profiles: MemberProfile | null
}

type ExpenseSigner = {
  spending_group_member_id: string
  spending_group_members: Member | null
}

type ExpenseWithSigners = BaseExpense & {
  expense_signer: ExpenseSigner[]
}

type GroupQuery = {
  id: string
  name: string
  icon: string
  created_by: string
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

  // 1) Traemos grupo y miembros (consulta simple para evitar fallos por joins opcionales)
  const { data: group, error } = await supabase
    .from('spending_groups')
    .select(
      `
        id,
        name,
        icon,
        created_by,
        members:spending_group_members (
          id,
          member_name,
          profile_id,
          profiles ( id, full_name, avatar_url )
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
  const members = baseGroup.members || []
  const membersById = new Map(members.map((m) => [m.id, m]))

  // 2) Traemos gastos + signers por separado; si falla, seguimos con lista vacía
  const { data: expensesData, error: expensesError } = await supabase
    .from('expenses')
    .select(
      `
        id,
        description,
        value,
        created_at,
        paid_by,
        currency_id,
        expense_signer!expense_signer_expense_id_fkey (
          spending_group_member_id,
          spending_group_members (
            id,
            member_name,
            profile_id,
            profiles ( id, full_name, avatar_url )
          )
        )
      `
    )
    .eq('spending_group_id', id)

  if (expensesError) {
    console.error('Error fetching expenses', expensesError)
  }

  const calcExpenses: ExpenseWithSigners[] = (expensesData || []).map((raw) => {
    const e = raw as Record<string, unknown>
    const signersRaw = Array.isArray(e.expense_signer)
      ? (e.expense_signer as unknown[])
      : []

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
      const es = esRaw as Record<string, unknown>
      return {
        spending_group_member_id: String(es.spending_group_member_id ?? ''),
        spending_group_members: normalizeMember(es.spending_group_members),
      }
    })

    return {
      id: String(e.id ?? ''),
      description: (e.description as string | undefined) ?? '',
      created_at: (e.created_at as string | undefined) ?? '',
      paid_by: String(e.paid_by ?? ''),
      value: Number(e.value ?? 0),
      split_between: signersRaw.length || 0,
      expense_signer: expenseSigner,
      currency_id: String(e.currency_id ?? ''),
    }
  })

// Helper para obtener el código de moneda ('ARS', 'USD')
  const getCurrencyCode = (id: string) => currencies.find(c => c.id === id)?.code || 'ARS';

  // 1. Totales gastados por moneda
  const totalsByCurrency: Record<string, number> = {};
  calcExpenses.forEach(e => {
    totalsByCurrency[e.currency_id] = (totalsByCurrency[e.currency_id] || 0) + e.value;
  });

  // 2. Balances netos por usuario Y por moneda (Para la tarjeta de resumen individual)
  const balancesByCurrency: Record<string, Record<string, number>> = {};
  members.forEach(m => balancesByCurrency[m.id] = {});

  calcExpenses.forEach(expense => {
    const curr = expense.currency_id;
    const creditor = expense.paid_by;
    const signers = expense.expense_signer || [];
    const share = expense.value / (signers.length || 1);

    signers.forEach(signer => {
      const debtor = signer.spending_group_member_id;
      balancesByCurrency[debtor][curr] = (balancesByCurrency[debtor][curr] || 0) - share;
    });
    // El que pagó recupera el total (menos su propia parte que ya se restó arriba si era signer)
    balancesByCurrency[creditor][curr] = (balancesByCurrency[creditor][curr] || 0) + expense.value;
  });

  // 3. Deudas Directas Exactas (Sin simplificación a terceros)
  // Estructura: debts[Deudor][Acreedor][Moneda] = Monto
  const directDebts: Record<string, Record<string, Record<string, number>>> = {};
  members.forEach(m => {
    directDebts[m.id] = {};
    members.forEach(m2 => { if (m.id !== m2.id) directDebts[m.id][m2.id] = {}; });
  });

  calcExpenses.forEach(expense => {
    const curr = expense.currency_id;
    const creditor = expense.paid_by;
    const signers = expense.expense_signer || [];
    const share = expense.value / (signers.length || 1);

    signers.forEach(signer => {
      const debtor = signer.spending_group_member_id;
      if (debtor !== creditor) { // No me debo a mí mismo
        directDebts[debtor][creditor][curr] = (directDebts[debtor][creditor][curr] || 0) + share;
      }
    });
  });

  // 4. Cancelación Mutua Directa (Si X le debe a Y $100, e Y le debe a X $40 -> X le debe a Y $60)
  type Settlement = { from: string; to: string; amount: number; currency_id: string };
  const settlements: Settlement[] = [];

  members.forEach(m1 => {
    members.forEach(m2 => {
      // Usamos >= para procesar cada par (m1, m2) una sola vez y no duplicar
      if (m1.id >= m2.id) return; 

      currencies.forEach(c => {
        const curr = c.id;
        const m1OwesM2 = directDebts[m1.id]?.[m2.id]?.[curr] || 0;
        const m2OwesM1 = directDebts[m2.id]?.[m1.id]?.[curr] || 0;

        if (m1OwesM2 > m2OwesM1) {
          settlements.push({ from: m1.id, to: m2.id, amount: m1OwesM2 - m2OwesM1, currency_id: curr });
        } else if (m2OwesM1 > m1OwesM2) {
          settlements.push({ from: m2.id, to: m1.id, amount: m2OwesM1 - m1OwesM2, currency_id: curr });
        }
      });
    });
  });

  const memberDisplay = (memberId: string) => {
    const member = membersById.get(memberId)
    return member?.profiles?.full_name || member?.member_name || 'Miembro'
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <header className="max-w-2xl mx-auto flex items-center justify-between mb-8 pt-4">
        <Link
          href="/spending-groups"
          className="p-2 hover:bg-zinc-900 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-4xl mb-2">{baseGroup.icon}</span>
          <h1 className="text-2xl font-bold">{baseGroup.name}</h1>
        </div>
        <div className="w-10" />
      </header>

      <main className="max-w-2xl mx-auto space-y-8">
        <div className="grid grid-cols-2 gap-4">
          <AddMemberModal groupId={id} />
          <MembersListModal
            groupId={id}
            members={members}
            memberCount={members.length}
            creatorId={baseGroup.created_by}
          />
          <AddExpenseModal groupId={id} members={members} currencies={currencies} />
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-white/10 bg-white/3 p-5 flex flex-col gap-2">
            <p className="text-sm text-zinc-400">Total gastado</p>
            <div className="flex flex-col gap-1">
              {Object.entries(totalsByCurrency).map(([currId, total]) => (
                <p key={currId} className="text-2xl font-bold">
                  {formatCurrency(total, getCurrencyCode(currId))}
                </p>
              ))}
              {Object.keys(totalsByCurrency).length === 0 && (
                <p className="text-2xl font-bold">$0.00</p>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              ({calcExpenses.length} gasto{calcExpenses.length === 1 ? '' : 's'})
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/3 p-5">
            <p className="text-sm text-zinc-400 mb-2">Balances individuales</p>
            <div className="space-y-2">
              {members.map((m) => {
                const userBalances = balancesByCurrency[m.id] || {};
                const activeCurrencies = Object.entries(userBalances).filter(([, val]) => Math.abs(val) > 0.01);
                return (
                  <div key={m.id} className="rounded-2xl bg-zinc-900/60 px-3 py-2 border border-white/5">
                    <span className="text-sm font-medium text-white">
                      {m.profiles?.full_name || m.member_name}
                    </span>
                    {activeCurrencies.length === 0 ? (
                      <div className="text-xs text-zinc-500 mt-1">Al día</div>
                    ) : (
                      <div className="mt-2 flex flex-col gap-1">
                        {activeCurrencies.map(([currId, balance]) => {
                          const positive = balance >= 0;
                          return (
                            <div key={currId} className="flex justify-between items-center bg-black/20 rounded px-2 py-1">
                              <span className="text-[10px] uppercase font-bold text-zinc-500">
                                {getCurrencyCode(currId)}
                              </span>
                              <span className={`text-xs font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                                {positive ? 'A favor ' : 'Debe '}
                                {formatCurrency(Math.abs(balance), getCurrencyCode(currId))}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* SECCIÓN DE DEUDAS EXACTAS (Settlements) */}
        <section className="rounded-3xl border border-white/10 bg-white/3 p-5">
          <div className="flex items-center gap-2 mb-3">
            <HandCoins className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Transferencias Sugeridas
            </h2>
          </div>
          {settlements.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              No hay deudas pendientes directas entre usuarios.
            </p>
          ) : (
            <div className="space-y-2">
              {settlements.map((s, idx) => (
                <div
                  key={`${s.from}-${s.to}-${s.currency_id}-${idx}`}
                  className="flex items-center justify-between rounded-2xl bg-zinc-900/60 px-4 py-3 border border-white/5"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-red-300 font-medium">{memberDisplay(s.from)}</span>
                    <span className="text-zinc-500 text-xs">le debe a</span>
                    <span className="text-emerald-300 font-medium">{memberDisplay(s.to)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-white">
                      {formatCurrency(s.amount, getCurrencyCode(s.currency_id))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Gastos recientes
            </h2>
          </div>
          <ExpensesClient groupId={id} members={members} expenses={calcExpenses} currencies={currencies}/>
        </section>
      </main>
    </div>
  )
}
