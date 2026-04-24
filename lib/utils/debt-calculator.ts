import type { ExpenseWithSigners } from '@/app/types/expense' 
import type { Member } from '@/app/types/member'
import type { Currency } from '@/app/types/currency' 

export interface DebtCalculationResult {
  totalsByCurrency: Record<string, number>;
  balancesByCurrency: Record<string, Record<string, number>>;
  settlements: { from: string; to: string; amount: number; currency_id: string }[];
}

export function calculateGroupDebts(
  expenses: ExpenseWithSigners[],
  members: Member[],
  currencies: Currency[]
): DebtCalculationResult {
  
  // 1. Totales gastados por moneda
  const totalsByCurrency: Record<string, number> = {};
  expenses.forEach(e => {
    totalsByCurrency[e.currency_id] = (totalsByCurrency[e.currency_id] || 0) + e.value;
  });

  // 2. Balances netos por usuario Y por moneda
  const balancesByCurrency: Record<string, Record<string, number>> = {};
  members.forEach(m => balancesByCurrency[m.id] = {});

  expenses.forEach(expense => {
    const curr = expense.currency_id;
    const creditor = expense.paid_by;
    const signers = expense.expense_signer || [];
    const share = expense.value / (signers.length || 1);

    signers.forEach(signer => {
      const debtor = signer.spending_group_member_id;
      balancesByCurrency[debtor][curr] = (balancesByCurrency[debtor][curr] || 0) - share;
    });
    balancesByCurrency[creditor][curr] = (balancesByCurrency[creditor][curr] || 0) + expense.value;
  });

  // 3. Deudas Directas Exactas
  const directDebts: Record<string, Record<string, Record<string, number>>> = {};
  members.forEach(m => {
    directDebts[m.id] = {};
    members.forEach(m2 => { if (m.id !== m2.id) directDebts[m.id][m2.id] = {}; });
  });

  expenses.forEach(expense => {
    const curr = expense.currency_id;
    const creditor = expense.paid_by;
    const signers = expense.expense_signer || [];
    const share = expense.value / (signers.length || 1);

    signers.forEach(signer => {
      const debtor = signer.spending_group_member_id;
      if (debtor !== creditor) {
        directDebts[debtor][creditor][curr] = (directDebts[debtor][creditor][curr] || 0) + share;
      }
    });
  });

  // 4. Cancelación Mutua Directa
  const settlements: { from: string; to: string; amount: number; currency_id: string }[] = [];

  members.forEach(m1 => {
    members.forEach(m2 => {
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

  // Devolvemos las 3 cosas que necesita la interfaz visual
  return {
    totalsByCurrency,
    balancesByCurrency,
    settlements
  };
}