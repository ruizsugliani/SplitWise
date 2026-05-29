"use client";

import { useEffect, useState } from "react";
import { Receipt, X, Paperclip, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Expense } from "@/app/types/expense";
import ToastConfirm from "./ui/toast-confirmation";
import { Currency } from "@/app/types/currency";
import { Member } from "@/app/types/member";

const getMemberName = (member: Member) => {
  return member.profiles?.full_name || member.member_name || "Sin nombre";
};

interface AddExpenseModalProps {
  groupId: string;
  members: Member[]; 
  currencies: Currency[];
  expenseToEdit?: Expense | null; 
  onCloseExternal?: () => void;  
  onSuccess?: (message: string) => void;
}

export function AddExpenseModal({
  groupId,
  members,
  currencies,
  expenseToEdit = null,
  onCloseExternal,
  onSuccess
}: AddExpenseModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isEditing = !!expenseToEdit;
  
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  
  // Estados para múltiples pagadores asimétricos
  const [activePayerIds, setActivePayerIds] = useState<string[]>([]);
  const [payers, setPayers] = useState<Record<string, string>>({});

  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [currencyId, setCurrencyId] = useState("");

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const router = useRouter();
  const supabase = createClient();

  // Inicialización y persistencia de edición
  useEffect(() => {
    if (expenseToEdit) {
      setAmount(expenseToEdit.value.toString());
      setDescription(expenseToEdit.description);
      setSelectedPeople(expenseToEdit.member_ids || []);
      setCurrencyId(expenseToEdit.currency_id || "");
      console.log(expenseToEdit)
      if (expenseToEdit.payers && expenseToEdit.payers.length > 0) {
        const initialPayers: Record<string, string> = {};
        const initialPayerIds: string[] = [];
        expenseToEdit.payers.forEach((p: any) => {
          const mId = p.spending_group_member_id || p.member_id;
          initialPayers[mId] = p.amount.toString();
          initialPayerIds.push(mId);
        });
        setPayers(initialPayers);
        setActivePayerIds(initialPayerIds);
      } else if (expenseToEdit.paid_by) {
        setPayers({ [expenseToEdit.paid_by]: expenseToEdit.value.toString() });
        setActivePayerIds([expenseToEdit.paid_by]);
      }

      setIsOpen(true);
    } else if (currencies.length > 0) {
      setCurrencyId(currencies[0].id);
    }
  }, [expenseToEdit, currencies]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  // Lógica de Sincronización del Balance del Gasto
  const handleMainAmountChange = (val: string) => {
    setAmount(val);
    const parsed = parseFloat(val) || 0;
    if (activePayerIds.length > 0) {
      const share = (parsed / activePayerIds.length).toFixed(2);
      const newPayers: Record<string, string> = {};
      activePayerIds.forEach((id, index) => {
        if (index === activePayerIds.length - 1) {
          const totalSoFar = parseFloat(share) * (activePayerIds.length - 1);
          newPayers[id] = (parsed - totalSoFar).toFixed(2);
        } else {
          newPayers[id] = share;
        }
      });
      setPayers(newPayers);
    }
  };

  const handlePayerAmountChange = (id: string, val: string) => {
    const newPayers = { ...payers, [id]: val };
    setPayers(newPayers);

    const total = activePayerIds.reduce((sum, pid) => {
      const pVal = pid === id ? val : newPayers[pid];
      return sum + (parseFloat(pVal) || 0);
    }, 0);
    setAmount(total > 0 ? Number(total.toFixed(2)).toString() : "");
  };

  const togglePayer = (id: string) => {
    let nextActive: string[];
    if (activePayerIds.includes(id)) {
      nextActive = activePayerIds.filter((p) => p !== id);
    } else {
      nextActive = [...activePayerIds, id];
    }
    setActivePayerIds(nextActive);

    const parsedAmount = parseFloat(amount) || 0;
    if (nextActive.length > 0) {
      const share = (parsedAmount / nextActive.length).toFixed(2);
      const newPayers: Record<string, string> = {};
      nextActive.forEach((pid, index) => {
        if (index === nextActive.length - 1) {
          const totalSoFar = parseFloat(share) * (nextActive.length - 1);
          newPayers[pid] = (parsedAmount - totalSoFar).toFixed(2);
        } else {
          newPayers[pid] = share;
        }
      });
      setPayers(newPayers);
    } else {
      setPayers({});
    }
  };
  
  const handleAddExpense = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay usuario");

      const parsedAmount = parseFloat(amount) || 0;

      // 1. FORMATEO JSONB PARA p_signers { id: monto_equitativo }
      const signersJson: Record<string, number> = {};
      if (selectedPeople.length > 0) {
        const share = parseFloat((parsedAmount / selectedPeople.length).toFixed(2));
        selectedPeople.forEach((id, index) => {
          if (index === selectedPeople.length - 1) {
            // El último se lleva el ajuste por decimales sobrantes
            const totalSoFar = share * (selectedPeople.length - 1);
            signersJson[id] = parseFloat((parsedAmount - totalSoFar).toFixed(2));
          } else {
            signersJson[id] = share;
          }
        });
      }

      // 2. FORMATEO JSONB PARA p_payers { id: monto_abonado }
      const payersJson: Record<string, number> = {};
      activePayerIds.forEach((id) => {
        payersJson[id] = parseFloat(payers[id]) || 0;
      });
      
      if (isEditing) {
        const { error } = await supabase.rpc("update_expense_with_signers", {
          p_expense_id: expenseToEdit.id,
          p_value: parsedAmount,
          p_description: description,
          p_signers: signersJson, // Actualizado a formato jsonb y renombrado
          p_currency_id: currencyId,
          p_payers: payersJson    // Actualizado a formato jsonb
        });
        if (error) throw error;

        if (receiptFile) {
          if (expenseToEdit.receipt_url) {
            await supabase.storage.from('expense-receipts').remove([expenseToEdit.receipt_url])
          }
          const fileExt = receiptFile.name.split('.').pop()
          const filePath = `${expenseToEdit.id}-${Math.random()}.${fileExt}`
          const { error: uploadError } = await supabase.storage.from('expense-receipts').upload(filePath, receiptFile)
          if (uploadError) throw uploadError
          const { error: updateError } = await supabase.from('expenses').update({ receipt_url: filePath }).eq('id', expenseToEdit.id)
          if (updateError) throw updateError
        }
      } else {
        const { error } = await supabase.rpc("create_expense_v4", {
          p_spending_group_id: groupId,
          p_created_by: user.id,
          p_value: parsedAmount,
          p_description: description,
          p_signers: signersJson,
          p_currency_id: currencyId,
          p_payers: payersJson
        });
        if (error) throw error;

        if (receiptFile) {
          const { data: newExpense } = await supabase
            .from('expenses')
            .select('id')
            .eq('spending_group_id', groupId)
            .eq('created_by', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (newExpense) {
            const fileExt = receiptFile.name.split('.').pop()
            const filePath = `${newExpense.id}-${Math.random()}.${fileExt}`
            const { error: uploadError } = await supabase.storage.from('expense-receipts').upload(filePath, receiptFile)
            if (uploadError) throw uploadError
            const { error: updateError } = await supabase.from('expenses').update({ receipt_url: filePath }).eq('id', newExpense.id)
            if (updateError) throw updateError
          }
        }
    }
      const successMsg = `Gasto ${isEditing ? "editado" : "guardado"} correctamente`;
      closeModal();
      if (onSuccess) onSuccess(successMsg)
      router.refresh();
    } catch (error: unknown) {
      console.error("Error al procesar gasto:", error);
      let errorMessage = "Error desconocido";
      if (error instanceof Error) errorMessage = error.message;
      alert(`Hubo un error al ${isEditing ? 'editar' : 'crear'} el gasto: ${errorMessage}`);
    } finally {
      setLoading(false)
    }
  };

  const togglePerson = (id: string) => {
    setSelectedPeople((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  // Checkbox global: Signers (Dividir entre)
  const allSelected = members.length > 0 && selectedPeople.length === members.length;
  const toggleAll = () => {
    if (allSelected) {
      setSelectedPeople([]);
    } else {
      setSelectedPeople(members.map((m) => m.id));
    }
  };

  // NUEVO: Checkbox global para Payers (Pagado por)
  const allPayersSelected = members.length > 0 && activePayerIds.length === members.length;
  const toggleAllPayers = () => {
    if (allPayersSelected) {
      setActivePayerIds([]);
      setPayers({});
    } else {
      const allIds = members.map((m) => m.id);
      setActivePayerIds(allIds);
      
      // Auto-distribuir equitativamente al seleccionar todos
      const parsedAmount = parseFloat(amount) || 0;
      const share = (parsedAmount / allIds.length).toFixed(2);
      const newPayers: Record<string, string> = {};
      allIds.forEach((id, index) => {
        if (index === allIds.length - 1) {
          const totalSoFar = parseFloat(share) * (allIds.length - 1);
          newPayers[id] = (parsedAmount - totalSoFar).toFixed(2);
        } else {
          newPayers[id] = share;
        }
      });
      setPayers(newPayers);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setAmount("");
    setDescription("");
    setActivePayerIds([]);
    setPayers({});
    setSelectedPeople([]);
    setReceiptFile(null);
    if (onCloseExternal) onCloseExternal();
  };

  const numericAmount = parseFloat(amount) || 0;
  const splitCount = selectedPeople.length || 1;
  const perPersonAmount = numericAmount / splitCount;

  const labelStyles = "text-xs font-semibold uppercase tracking-wider block mb-2 text-zinc-400";
  const inputStyles = "w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-600 [&>option]:bg-[#121212]";

  return (
    <>
      {!onCloseExternal && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full group flex items-center justify-center gap-3 rounded-2xl bg-emerald-500/10 px-4 py-4 text-emerald-400 border border-emerald-500/20 font-semibold transition-all hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] active:scale-[0.98]"
        >
          <Receipt className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
          <span>Agregar nuevo gasto</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />

          <div className="relative bg-[#121212] border border-white/10 w-full max-w-sm rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[92vh] overflow-y-auto custom-scrollbar">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {isEditing ? "Editar Gasto" : "Agregar Gasto"}
              </h2>
              <button
                onClick={closeModal}
                className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 rounded-full p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Valor y Moneda */}
            <div className="grid grid-cols-[1fr_auto] gap-3 mb-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <label className={labelStyles}>Valor Total</label>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold text-xl">$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => handleMainAmountChange(e.target.value)}
                    className="w-full bg-transparent outline-none text-2xl font-bold text-white placeholder:text-zinc-700 appearance-none"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/20 p-3 min-w-25">
                <label className={labelStyles}>Moneda</label>
                <select
                  value={currencyId}
                  onChange={(e) => setCurrencyId(e.target.value)}
                  className="w-full bg-transparent outline-none text-white font-medium cursor-pointer [&>option]:bg-[#121212] pt-1"
                >
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className={labelStyles}>Descripción</label>
              <input
                type="text"
                autoFocus
                placeholder="Ej: Cena, Uber, Entradas..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputStyles}
              />
            </div>

            {/* SELECCIONABLE: Pagado por (Múltiples Pagadores) */}
            <div className="mb-4">
              <label className={labelStyles}>Pagado por</label>
              <div className="rounded-2xl border border-white/5 bg-black/30 p-2 overflow-hidden">
                {/* NUEVO: Opción Seleccionar Todos para Pagadores */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-black/20 mb-1 rounded-xl">
                  <label className="flex items-center gap-3 font-medium text-white cursor-pointer w-full text-xs">
                    <input
                      type="checkbox"
                      checked={allPayersSelected}
                      onChange={toggleAllPayers}
                      className="w-4 h-4 accent-emerald-500 bg-zinc-900 border-zinc-700 rounded cursor-pointer"
                    />
                    Seleccionar Todos
                  </label>
                </div>

                <div className="max-h-28 overflow-y-auto custom-scrollbar px-1">
                  {members.map((p) => {
                    const isPayerActive = activePayerIds.includes(p.id);
                    const payerValue = payers[p.id] || "";
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-lg transition-colors gap-2"
                      >
                        <label className="flex items-center gap-3 cursor-pointer flex-1 text-sm text-zinc-300 min-w-0">
                          <input
                            type="checkbox"
                            checked={isPayerActive}
                            onChange={() => togglePayer(p.id)}
                            className="w-4 h-4 accent-emerald-500 bg-zinc-900 border-zinc-700 rounded cursor-pointer shrink-0"
                          />
                          <span className="truncate">{getMemberName(p)}</span>
                        </label>

                        {isPayerActive ? (
                          <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 w-24">
                            <span className="text-emerald-500/70 text-xs font-mono">$</span>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={payerValue}
                              onChange={(e) => handlePayerAmountChange(p.id, e.target.value)}
                              className="w-full bg-transparent text-right text-sm text-emerald-400 font-mono outline-none appearance-none"
                            />
                          </div>
                        ) : (
                          <span className="text-sm font-mono text-zinc-600 pr-2">$0.00</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Split among (Dividir Entre) */}
            <div className="mb-6">
              <label className={labelStyles}>Dividir Entre</label>
              <div className="rounded-2xl border border-white/5 bg-black/30 p-2 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-black/20 mb-1 rounded-xl">
                  <label className="flex items-center gap-3 font-medium text-white cursor-pointer w-full text-xs">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-emerald-500 bg-zinc-900 border-zinc-700 rounded cursor-pointer"
                    />
                    Seleccionar Todos
                  </label>
                </div>
                
                <div className="max-h-28 overflow-y-auto custom-scrollbar px-1">
                  {members.map((p) => {
                    const isSelected = selectedPeople.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <label className="flex items-center gap-3 cursor-pointer flex-1 text-sm text-zinc-300">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => togglePerson(p.id)}
                            className="w-4 h-4 accent-emerald-500 bg-zinc-900 border-zinc-700 rounded cursor-pointer"
                          />
                          <span className="truncate max-w-30">{getMemberName(p)}</span>
                        </label>

                        <span className={`text-sm font-mono ${isSelected ? 'text-emerald-400' : 'text-zinc-600'}`}>
                          ${isSelected ? perPersonAmount.toFixed(2) : "0.00"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Comprobante */}
            <div className="mb-6">
              <label className={labelStyles}>Ticket / Comprobante (opcional)</label>
              <label
                htmlFor="expense-receipt-upload"
                className={`flex items-center gap-2 cursor-pointer ${inputStyles} ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <Paperclip className="w-4 h-4 text-zinc-500 shrink-0" />
                <span className="text-sm truncate">
                  {receiptFile ? receiptFile.name : 'Adjuntar imagen o PDF...'}
                </span>
              </label>
              <input
                id="expense-receipt-upload"
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                disabled={loading}
              />
            </div>

            {/* Submit */}
            <button
              disabled={!amount || !description || activePayerIds.length === 0 || !currencyId || selectedPeople.length === 0 || loading}
              onClick={handleAddExpense}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:bg-emerald-600/30 disabled:text-white/50 active:scale-[0.98] flex items-center justify-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {receiptFile ? 'Subiendo...' : 'Guardando...'}
                </span>
              ) : (isEditing ? "Guardar Cambios" : "Confirmar Gasto")}
            </button>
          </div>
        </div>
      )}
      
      {toastMessage && (
        <ToastConfirm toastMessage={toastMessage} />
      )}
    </>
  );
}