import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Wallet, HandCoins } from 'lucide-react'
import { AddMemberModal } from '@/components/add-member-modal'
import { MembersListModal } from '@/components/ui/members-list-modal'
import ExpensesClient from '@/components/expenses-client'
import { AddExpenseModal } from '@/components/add-expense-modal'
import Link from 'next/link'
import type { Expense as BaseExpense } from '@/app/types/expense'
import { EditGroupModal } from '@/components/edit-group-modal'

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

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
})

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
    }
  })

  const totalExpenses = calcExpenses.reduce((acc, e) => acc + e.value, 0)

  // Balances por miembro
  const balances: Record<string, number> = members.reduce((acc, m) => {
    acc[m.id] = 0
    return acc
  }, {} as Record<string, number>)

  calcExpenses.forEach((expense) => {
    const signers = expense.expense_signer || []
    const signerCount = signers.length || 1
    const share = expense.value / signerCount

    // Todos los signers deben su parte
    signers.forEach((signer) => {
      const memberId = signer.spending_group_member_id
      if (balances[memberId] === undefined) balances[memberId] = 0
      balances[memberId] -= share
    })

    // Quien pagó recibe el total
    if (balances[expense.paid_by] === undefined) balances[expense.paid_by] = 0
    balances[expense.paid_by] += expense.value
  })

  type Settlement = { from: string; to: string; amount: number }
  const settlements: Settlement[] = []
  const debtors = Object.entries(balances)
    .filter(([, v]) => v < -0.009)
    .map(([id, v]) => ({ id, amount: v }))
    .sort((a, b) => a.amount - b.amount) // más deuda primero (más negativo)
  const creditors = Object.entries(balances)
    .filter(([, v]) => v > 0.009)
    .map(([id, v]) => ({ id, amount: v }))
    .sort((a, b) => b.amount - a.amount) // más a favor primero

  let d = 0
  let c = 0
  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d]
    const creditor = creditors[c]
    const pay = Math.min(creditor.amount, -debtor.amount)

    settlements.push({ from: debtor.id, to: creditor.id, amount: pay })

    debtor.amount += pay // menos negativo
    creditor.amount -= pay

    if (Math.abs(debtor.amount) < 0.01) d++
    if (creditor.amount < 0.01) c++
  }

  const memberDisplay = (memberId: string) => {
    const member = membersById.get(memberId)
    return member?.profiles?.full_name || member?.member_name || 'Miembro'
  }

  // 3) Traemos listado plano para la UI de cards/borrado
  const { data: expensesListData, error: expensesListError } = await supabase
    .from('expenses_with_details')
    .select('id, description, value, created_at, paid_by, split_between')
    .eq('spending_group_id', id)

  if (expensesListError) {
    console.error('Error fetching expenses_with_details', expensesListError)
  }

  const expensesList: BaseExpense[] = (expensesListData || []).map((e) => ({
    id: String(e.id),
    description: (e.description as string) ?? '',
    value: Number(e.value ?? 0),
    created_at: (e.created_at as string) ?? '',
    paid_by: (e.paid_by as string) ?? '',
    split_between: Number(e.split_between ?? 0),
  }))

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
        <EditGroupModal 
          groupId={id} 
          initialName={baseGroup.name} 
          initialIcon={baseGroup.icon} 
        />
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
          <AddExpenseModal groupId={id} members={members} />
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-white/10 bg-white/3 p-5 flex flex-col gap-2">
            <p className="text-sm text-zinc-400">Total gastado</p>
            <p className="text-3xl font-bold">{currencyFormatter.format(totalExpenses)}</p>
            <p className="text-xs text-zinc-500">
              ({calcExpenses.length} gasto{calcExpenses.length === 1 ? '' : 's'})
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/3 p-5">
            <p className="text-sm text-zinc-400 mb-2">Balances individuales</p>
            <div className="space-y-2">
              {members.map((m) => {
                const balance = balances[m.id] || 0
                const positive = balance >= 0
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-2xl bg-zinc-900/60 px-3 py-2"
                  >
                    <span className="text-sm">
                      {m.profiles?.full_name || m.member_name}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        positive ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {positive ? 'A favor ' : 'Debe '}
                      {currencyFormatter.format(Math.abs(balance))}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/3 p-5">
          <div className="flex items-center gap-2 mb-3">
            <HandCoins className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Deudas
            </h2>
          </div>
          {settlements.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              No hay deudas pendientes. Agregá gastos para calcular balances.
            </p>
          ) : (
            <div className="space-y-2">
              {settlements.map((s, idx) => (
                <div
                  key={`${s.from}-${s.to}-${idx}`}
                  className="flex items-center justify-between rounded-2xl bg-zinc-900/60 px-4 py-3 border border-white/5"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-red-300 font-medium">{memberDisplay(s.from)}</span>
                    <span className="text-zinc-500">le debe a</span>
                    <span className="text-emerald-300 font-medium">{memberDisplay(s.to)}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {currencyFormatter.format(s.amount)}
                  </span>
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
          <ExpensesClient expenses={expensesList} />
        </section>
      </main>
    </div>
  )
}
