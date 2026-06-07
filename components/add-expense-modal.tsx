"use client";

import { useEffect, useState } from "react";
import { Receipt, X, Paperclip, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Expense } from "@/app/types/expense";
import ToastConfirm from "./ui/toast-confirmation";
import { Currency } from "@/app/types/currency";
import { Member } from "@/app/types/member";
import { currencyConfig } from "@/lib/currency-config";
import CurrencySelector from "./currency-selector";

const getMemberName = (member: Member) => {
  return member.profiles?.full_name || member.member_name || "Sin nombre";
};

// Función auxiliar para distribuir un monto total equitativamente entre N personas
const distributeEqually = (ids: string[], total: number): Record<string, string> => {
  if (ids.length === 0) return {};
  const share = (total / ids.length).toFixed(2);
  const result: Record<string, string> = {};
  ids.forEach((id, index) => {
    if (index === ids.length - 1) {
      // El último absorbe cualquier diferencia de centavos por redondeo
      const totalSoFar = parseFloat(share) * (ids.length - 1);
      result[id] = (total - totalSoFar).toFixed(2);
    } else {
      result[id] = share;
    }
  });
  return result;
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
  
  // Estados para Múltiples Pagadores
  const [activePayerIds, setActivePayerIds] = useState<string[]>([]);
  const [payers, setPayers] = useState<Record<string, string>>({});

  // Estados para Múltiples Suscriptores (Dividir Entre)
  const [activeSignerIds, setActiveSignerIds] = useState<string[]>([]);
  const [signerAmounts, setSignerAmounts] = useState<Record<string, string>>({});
  
  // Array para recordar a quiénes editó manualmente el usuario y no pisar sus montos
  const [lockedSigners, setLockedSigners] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [currencyId, setCurrencyId] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  // Inicialización y persistencia de edición
  useEffect(() => {
    if (expenseToEdit) {
      setAmount(expenseToEdit.value.toString());
      setDescription(expenseToEdit.description);
      setCurrencyId(expenseToEdit.currency_id || "");

      // 1. Cargar Pagadores
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

// 2. Cargar Suscriptores (Signers)
      if (expenseToEdit.expense_signer && expenseToEdit.expense_signer.length > 0) {
        const initialSignerAmounts: Record<string, string> = {};
        const initialSignerIds: string[] = [];
        
        expenseToEdit.expense_signer.forEach((s: any) => {
          const mId = s.spending_group_member_id || s.member_id;
          // Almacenamos el valor exacto de la base de datos sin alterar ni recalcular nada
          initialSignerAmounts[mId] = s.amount_due.toString();
          initialSignerIds.push(mId);
        });
        
        setSignerAmounts(initialSignerAmounts);
        setActiveSignerIds(initialSignerIds);
        
        // Inicializamos los bloqueos (locks) con todos los miembros cargados para preservar la asimetría original
        setLockedSigners(initialSignerIds);
        
      } else if (expenseToEdit.member_ids) {
        setActiveSignerIds(expenseToEdit.member_ids);
        setSignerAmounts(distributeEqually(expenseToEdit.member_ids, expenseToEdit.value));
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
  }, [toastMessage]);

  // ==========================================
  // MANEJO DE MONTOS GLOBALES
  // ==========================================
  const handleMainAmountChange = (val: string) => {
    setAmount(val);
    const parsed = parseFloat(val) || 0;
    
    if (activePayerIds.length > 0) setPayers(distributeEqually(activePayerIds, parsed));
    if (activeSignerIds.length > 0) {
      setLockedSigners([]); // Limpiamos bloqueos
      setSignerAmounts(distributeEqually(activeSignerIds, parsed));
    }
  };

  // ==========================================
  // MANEJO DE PAGADORES (Afectan el Total)
  // ==========================================
  const togglePayer = (id: string) => {
    const nextActive = activePayerIds.includes(id) 
      ? activePayerIds.filter((p) => p !== id) 
      : [...activePayerIds, id];
    
    setActivePayerIds(nextActive);
    const parsedAmount = parseFloat(amount) || 0;
    setPayers(nextActive.length > 0 ? distributeEqually(nextActive, parsedAmount) : {});
  };

  const handlePayerAmountChange = (id: string, val: string) => {
    const newPayers = { ...payers, [id]: val };
    setPayers(newPayers);

    // Sumar todos los pagadores para calcular el nuevo Total
    const newTotal = activePayerIds.reduce((sum, pid) => sum + (parseFloat(newPayers[pid]) || 0), 0);
    const newTotalStr = newTotal > 0 ? newTotal.toFixed(2) : "";
    setAmount(newTotalStr);

    // Si el total cambió, auto-repartimos a los suscriptores para completar el 100%
    if (activeSignerIds.length > 0 && newTotal > 0) {
      setLockedSigners([]);
      setSignerAmounts(distributeEqually(activeSignerIds, newTotal));
    }
  };

  const allPayersSelected = members.length > 0 && activePayerIds.length === members.length;
  const toggleAllPayers = () => {
    if (allPayersSelected) {
      setActivePayerIds([]);
      setPayers({});
    } else {
      const allIds = members.map((m) => m.id);
      setActivePayerIds(allIds);
      setPayers(distributeEqually(allIds, parseFloat(amount) || 0));
    }
  };

  // ==========================================
  // MANEJO DE SUSCRIPTORES (Auto-balance Inteligente)
  // ==========================================
  const toggleSigner = (id: string) => {
    const nextActive = activeSignerIds.includes(id) 
      ? activeSignerIds.filter((p) => p !== id) 
      : [...activeSignerIds, id];
    
    setActiveSignerIds(nextActive);
    setLockedSigners([]);
    const parsedAmount = parseFloat(amount) || 0;
    setSignerAmounts(nextActive.length > 0 ? distributeEqually(nextActive, parsedAmount) : {});
  };

  const handleSignerAmountChange = (editedId: string, valStr: string) => {
    const newVal = parseFloat(valStr) || 0;
    const parsedTotal = parseFloat(amount) || 0;
    const newSigners = { ...signerAmounts, [editedId]: valStr };
    
    // Agregamos al usuario a la lista de "bloqueados" para no pisar su monto manual
    const newLocked = Array.from(new Set([...lockedSigners, editedId]));
    const otherIds = activeSignerIds.filter(id => id !== editedId);
    
    if (otherIds.length > 0) {
      let unlockedOthers = otherIds.filter(id => !newLocked.includes(id));
      
      // Si todos los demás están bloqueados, desbloqueamos a la fuerza para poder repartir la diferencia
      if (unlockedOthers.length === 0) {
        unlockedOthers = otherIds;
        setLockedSigners([editedId]); 
      } else {
        setLockedSigners(newLocked);
      }

      // Cuánto dinero ya está reservado por los bloqueados
      const lockedSum = otherIds
        .filter(id => newLocked.includes(id))
        .reduce((sum, id) => sum + (parseFloat(newSigners[id]) || 0), 0);

      const remaining = parsedTotal - newVal - lockedSum;
      
      // Distribuir lo que sobra entre los desbloqueados
      const share = (remaining / unlockedOthers.length).toFixed(2);
      unlockedOthers.forEach((id, index) => {
        if (index === unlockedOthers.length - 1) {
          const totalSoFar = parseFloat(share) * (unlockedOthers.length - 1);
          newSigners[id] = (remaining - totalSoFar).toFixed(2);
        } else {
          newSigners[id] = share;
        }
      });
    } else if (activeSignerIds.length === 1) {
      // Si hay un solo suscriptor y lo editan, forzamos la actualización del total general
      setAmount(valStr);
      if (activePayerIds.length > 0) {
        setPayers(distributeEqually(activePayerIds, newVal));
      }
    }

    setSignerAmounts(newSigners);
  };

  const handleSignerPercentChange = (id: string, pctStr: string) => {
    const parsedTotal = parseFloat(amount) || 0;
    const pct = parseFloat(pctStr) || 0;
    const newVal = ((pct / 100) * parsedTotal).toFixed(2);
    handleSignerAmountChange(id, newVal);
  };

  const getPercentStr = (id: string) => {
    const val = parseFloat(signerAmounts[id]) || 0;
    const tot = parseFloat(amount) || 0;
    if (tot === 0) return "";
    const pct = (val / tot) * 100;
    return parseFloat(pct.toFixed(2)).toString();
  };

  const allSignersSelected = members.length > 0 && activeSignerIds.length === members.length;
  const toggleAllSigners = () => {
    if (allSignersSelected) {
      setActiveSignerIds([]);
      setSignerAmounts({});
    } else {
      const allIds = members.map((m) => m.id);
      setActiveSignerIds(allIds);
      setLockedSigners([]);
      setSignerAmounts(distributeEqually(allIds, parseFloat(amount) || 0));
    }
  };

  // ==========================================
  // ENVÍO DE DATOS
  // ==========================================
  const handleAddExpense = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay usuario");

      const parsedAmount = parseFloat(amount) || 0;

      const signersJson: Record<string, number> = {};
      activeSignerIds.forEach((id) => {
        signersJson[id] = parseFloat(signerAmounts[id]) || 0;
      });

      const payersJson: Record<string, number> = {};
      activePayerIds.forEach((id) => {
        payersJson[id] = parseFloat(payers[id]) || 0;
      });
      
      if (isEditing) {
        const { error } = await supabase.rpc("update_expense_v4", {
          p_expense_id: expenseToEdit.id,
          p_modified_by: user.id, // Tu historial / auditoría
          p_value: parsedAmount,
          p_description: description,
          p_signers: signersJson,
          p_currency_id: currencyId,
          p_payers: payersJson
        });
        if (error) throw error;
        
        // Manejo de Recibo (Ticket) si subió o borró foto...
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
        
        // Guardar Recibo si lo hay...
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
      if (onSuccess) onSuccess(successMsg);
      router.refresh();

    } catch (error: unknown) {
      console.error("Error al procesar gasto:", error);
      let errorMessage = "Error desconocido";
      if (error instanceof Error) errorMessage = error.message;
      alert(`Hubo un error al ${isEditing ? 'editar' : 'crear'} el gasto: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setAmount("");
    setDescription("");
    setActivePayerIds([]);
    setPayers({});
    setActiveSignerIds([]);
    setSignerAmounts({});
    setLockedSigners([]);
    setReceiptFile(null);
    if (onCloseExternal) onCloseExternal();
  };

  // ==========================================
  // VALIDACIONES VISUALES
  // ==========================================
  const numericAmount = parseFloat(amount) || 0;
  
  const totalPayersAmount = activePayerIds.reduce((sum, id) => sum + (parseFloat(payers[id]) || 0), 0);
  const isPayersValid = Math.abs(numericAmount - totalPayersAmount) < 0.05;

  const totalSignersAmount = activeSignerIds.reduce((sum, id) => sum + (parseFloat(signerAmounts[id]) || 0), 0);
  const isSignersValid = Math.abs(numericAmount - totalSignersAmount) < 0.05;

  const isReadyToSubmit = 
    amount !== "" && description !== "" && currencyId !== "" &&
    activePayerIds.length > 0 && activeSignerIds.length > 0 &&
    isPayersValid && isSignersValid && !loading;

  const labelStyles = "text-xs font-semibold uppercase tracking-wider block text-zinc-400";
  const inputStyles = "w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-600 [&>option]:bg-[#121212]";

  const selectedCurrency = currencies.find(
    (c) => c.id === currencyId
  );

  const currencyMeta = selectedCurrency ? currencyConfig[selectedCurrency.code as keyof typeof currencyConfig] : undefined;

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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative bg-[#121212] border border-white/10 w-full max-w-sm rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[92vh] overflow-y-auto custom-scrollbar">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {isEditing ? "Editar Gasto" : "Agregar Gasto"}
              </h2>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 rounded-full p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Valor y Moneda */}
            <div className="grid grid-cols-[1fr_auto] gap-3 mb-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <label className={labelStyles + " mb-2"}>Valor Total</label>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold text-xl">{currencyMeta?.symbol ?? "$"}</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => handleMainAmountChange(e.target.value)}
                    className="w-full bg-transparent outline-none text-2xl font-bold text-white placeholder:text-zinc-700 appearance-none"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/20 p-3 min-w-[100px]">
                <label className={labelStyles + " mb-2"}>Moneda</label>
                <CurrencySelector
                  currencies={currencies}
                  value={currencyId}
                  onChange={setCurrencyId}
                />
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className={labelStyles + " mb-2"}>Descripción</label>
              <input
                type="text"
                autoFocus
                placeholder="Ej: Cena, Uber, Entradas..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputStyles}
              />
            </div>

            {/* ======================================= */}
            {/* PAGADO POR */}
            {/* ======================================= */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className={labelStyles}>Pagado por</label>
                <button 
                  type="button" 
                  onClick={() => setPayers(distributeEqually(activePayerIds, numericAmount))}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                >
                  ⚖️ Repartir
                </button>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/30 p-2 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-black/20 mb-1 rounded-xl">
                  <label className="flex items-center gap-3 font-medium text-white cursor-pointer w-full text-xs">
                    <input type="checkbox" checked={allPayersSelected} onChange={toggleAllPayers} className="w-4 h-4 accent-emerald-500 bg-zinc-900 border-zinc-700 rounded cursor-pointer" />
                    Seleccionar Todos
                  </label>
                </div>

                <div className="max-h-28 overflow-y-auto custom-scrollbar px-1">
                  {members.map((p) => {
                    const isPayerActive = activePayerIds.includes(p.id);
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-lg transition-colors gap-2">
                        <label className="flex items-center gap-3 cursor-pointer flex-1 text-sm text-zinc-300 min-w-0">
                          <input type="checkbox" checked={isPayerActive} onChange={() => togglePayer(p.id)} className="w-4 h-4 accent-emerald-500 bg-zinc-900 border-zinc-700 rounded cursor-pointer shrink-0" />
                          <span className="truncate">{getMemberName(p)}</span>
                        </label>
                        {isPayerActive ? (
                          <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 w-24">
                            <span className="text-emerald-500/70 text-xs font-mono">{currencyMeta?.symbol ?? "$"}</span>
                            <input type="number" placeholder="0.00" value={payers[p.id] || ""} onChange={(e) => handlePayerAmountChange(p.id, e.target.value)} className="w-full bg-transparent text-right text-sm text-emerald-400 font-mono outline-none appearance-none" />
                          </div>
                        ) : (
                          <span className="text-sm font-mono text-zinc-600 pr-2">{currencyMeta?.symbol ?? "$"}0.00</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Alerta si no cuadra la suma */}
              {!isPayersValid && numericAmount > 0 && activePayerIds.length > 0 && (
                <p className="text-red-400 text-xs mt-2 px-1">
                  La suma pagada ({currencyMeta?.symbol ?? "$"}{totalPayersAmount.toFixed(2)}) no coincide con el total ({currencyMeta?.symbol ?? "$"}{numericAmount.toFixed(2)}).
                </p>
              )}
            </div>

            {/* ======================================= */}
            {/* DIVIDIR ENTRE (SUSCRIPTORES) */}
            {/* ======================================= */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className={labelStyles}>Dividir Entre</label>
                <button 
                  type="button" 
                  onClick={() => {
                    setLockedSigners([]);
                    setSignerAmounts(distributeEqually(activeSignerIds, numericAmount));
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                >
                  ⚖️ Repartir
                </button>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/30 p-2 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-black/20 mb-1 rounded-xl">
                  <label className="flex items-center gap-3 font-medium text-white cursor-pointer w-full text-xs">
                    <input type="checkbox" checked={allSignersSelected} onChange={toggleAllSigners} className="w-4 h-4 accent-emerald-500 bg-zinc-900 border-zinc-700 rounded cursor-pointer" />
                    Seleccionar Todos
                  </label>
                </div>
                
                <div className="max-h-36 overflow-y-auto custom-scrollbar px-1">
                  {members.map((p) => {
                    const isActive = activeSignerIds.includes(p.id);
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-lg transition-colors">
                        <label className="flex items-center gap-3 cursor-pointer flex-1 text-sm text-zinc-300">
                          <input type="checkbox" checked={isActive} onChange={() => toggleSigner(p.id)} className="w-4 h-4 accent-emerald-500 bg-zinc-900 border-zinc-700 rounded cursor-pointer shrink-0" />
                          <span className="truncate max-w-[100px]">{getMemberName(p)}</span>
                        </label>

                        {isActive ? (
                          <div className="flex items-center gap-2">
                            {/* Porcentaje */}
                            <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 w-[70px]">
                              <input type="number" placeholder="0" value={getPercentStr(p.id)} onChange={(e) => handleSignerPercentChange(p.id, e.target.value)} className="w-full bg-transparent text-right text-xs text-zinc-300 font-mono outline-none appearance-none" />
                              <span className="text-emerald-500/70 text-xs font-mono">%</span>
                            </div>
                            {/* Monto */}
                            <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 w-[90px]">
                              <span className="text-emerald-500/70 text-xs font-mono">{currencyMeta?.symbol ?? "$"}</span>
                              <input type="number" placeholder="0.00" value={signerAmounts[p.id] || ""} onChange={(e) => handleSignerAmountChange(p.id, e.target.value)} className="w-full bg-transparent text-right text-sm text-emerald-400 font-mono outline-none appearance-none" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm font-mono text-zinc-600 pr-2">{currencyMeta?.symbol ?? "$"}0.00</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Alerta si no cuadra la suma */}
              {!isSignersValid && numericAmount > 0 && activeSignerIds.length > 0 && (
                <p className="text-red-400 text-xs mt-2 px-1">
                  La suma dividida ({currencyMeta?.symbol ?? "$"}{totalSignersAmount.toFixed(2)}) no coincide con el total ({currencyMeta?.symbol ?? "$"}{numericAmount.toFixed(2)}).
                </p>
              )}
            </div>

            {/* Comprobante */}
            <div className="mb-6">
              <label className={labelStyles + " mb-2"}>Ticket / Comprobante (opcional)</label>
              <label htmlFor="expense-receipt-upload" className={`flex items-center gap-2 cursor-pointer ${inputStyles} ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <Paperclip className="w-4 h-4 text-zinc-500 shrink-0" />
                <span className="text-sm truncate">
                  {receiptFile ? receiptFile.name : 'Adjuntar imagen o PDF...'}
                </span>
              </label>
              <input id="expense-receipt-upload" type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} disabled={loading} />
            </div>

            {/* Submit */}
            <button
              disabled={!isReadyToSubmit}
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
      
      {toastMessage && <ToastConfirm toastMessage={toastMessage} />}
    </>
  );
}