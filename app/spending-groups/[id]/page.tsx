import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, ReceiptText, Wallet, HandCoins } from 'lucide-react'
import { AddMemberModal } from '@/components/add-member-modal'
import { MembersListModal } from '@/components/ui/members-list-modal'
import Link from 'next/link'

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

type Expense = {
  id: string
  description: string
  value: number
  created_at: string
  paid_by: string
  expense_signer: ExpenseSigner[]
}

type GroupQuery = {
  id: string
  name: string
  icon: string
  created_by: string
  members: Member[]
  expenses: Expense[]
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

  const expenses = (expensesData || []).map((e) => ({
    ...e,
    value: Number(e.value || 0),
  })) as Expense[]

  const totalExpenses = expenses.reduce((acc, e) => acc + e.value, 0)

  // Balances por miembro
  const balances: Record<string, number> = members.reduce((acc, m) => {
    acc[m.id] = 0
    return acc
  }, {} as Record<string, number>)

  expenses.forEach((expense) => {
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

  const sortedExpenses = expenses
    .slice()
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

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
          <button className="col-span-2 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]">
            <ReceiptText className="w-5 h-5" />
            Agregar gasto
          </button>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 flex flex-col gap-2">
            <p className="text-sm text-zinc-400">Total gastado</p>
            <p className="text-3xl font-bold">{currencyFormatter.format(totalExpenses)}</p>
            <p className="text-xs text-zinc-500">
              ({expenses.length} gasto{expenses.length === 1 ? '' : 's'})
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
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

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 mb-3">
            <HandCoins className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Deudas sugeridas
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

        <section>
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Gastos recientes
            </h2>
          </div>
          {sortedExpenses.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl">
              <p className="text-zinc-500 italic">
                Aún no se han registrado gastos. Comienza agregando alguno!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedExpenses.map((expense) => {
                const payerName = memberDisplay(expense.paid_by)
                const signerCount = expense.expense_signer?.length || 0
                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between rounded-2xl bg-zinc-900/60 px-4 py-3 border border-white/5"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">{expense.description}</span>
                      <span className="text-xs text-zinc-500">
                        Pagó {payerName} • {signerCount} participante
                        {signerCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-white">
                        {currencyFormatter.format(expense.value)}
                      </span>
                      <p className="text-[10px] text-zinc-500">
                        {new Date(expense.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
