"use client";

import { useEffect, useState } from "react";
import { Receipt, X } from "lucide-react";
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
  const [paidBy, setPaidBy] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currencyId, setCurrencyId] = useState("");

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (expenseToEdit) {
      setAmount(expenseToEdit.value.toString());
      setDescription(expenseToEdit.description);
      setPaidBy(expenseToEdit.paid_by || ""); 
      setSelectedPeople(expenseToEdit.member_ids || []);
      setCurrencyId(expenseToEdit.currency_id || "");
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
  
  const handleAddExpense = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay usuario");
      
      if (isEditing) {
        const { error } = await supabase.rpc("update_expense_with_signers", {
          p_expense_id: expenseToEdit.id,
          p_paid_by: paidBy,
          p_value: parseFloat(amount),
          p_description: description,
          p_member_ids: selectedPeople,
          p_currency_id: currencyId,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("create_expense_with_signers", {
          p_spending_group_id: groupId,
          p_created_by: user.id,
          p_paid_by: paidBy,
          p_value: amount,
          p_description: description,
          p_member_ids: selectedPeople,
          p_currency_id: currencyId,
        });

        if (error) throw error;
    }
      const successMsg = `Gasto ${isEditing ? "editado" : "guardado"} correctamente`;
      closeModal();
      if (onSuccess) onSuccess(successMsg)
      router.refresh();
    } catch (error: unknown) {
      console.error("Error al procesar gasto:", error);
      
      let errorMessage = "Error desconocido";

      if (error instanceof Error) {
        errorMessage = error.message;
      } 
      else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String((error as Record<string, unknown>).message);
      } 
      else if (typeof error === 'string') {
        errorMessage = error;
      }

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

  const allSelected = members.length > 0 && selectedPeople.length === members.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedPeople([]); // uncheck all
    } else {
      setSelectedPeople(members.map((m) => m.id)); // check all
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setAmount("");
    setDescription("");
    setPaidBy("");
    setSelectedPeople([]);
    if (onCloseExternal) onCloseExternal();
  };

  // Calculation logic
  const numericAmount = parseFloat(amount) || 0;
  const splitCount = selectedPeople.length || 1;
  const perPersonAmount = numericAmount / splitCount;

  // Clases compartidas para inputs
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

          <div className="relative bg-[#121212] border border-white/10 w-full max-w-sm rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            
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

            {/* Valor y Moneda agrupados para mejor layout */}
            <div className="grid grid-cols-[1fr_auto] gap-3 mb-4">
              {/* Amount */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <label className={labelStyles}>Valor</label>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold text-xl">$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-transparent outline-none text-2xl font-bold text-white placeholder:text-zinc-700 appearance-none"
                  />
                </div>
              </div>

              {/* Currency Select */}
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

            {/* Paid by */}
            <div className="mb-4">
              <label className={labelStyles}>Pagado por</label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className={inputStyles}
              >
                <option value="" disabled>Seleccionar miembro...</option>
                {members.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getMemberName(p)}
                  </option>
                ))}
              </select>
            </div>

            {/* Split among */}
            <div className="mb-6">
              <label className={labelStyles}>Dividir Entre</label>

              <div className="rounded-2xl border border-white/5 bg-black/30 p-2 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-black/20 mb-1 rounded-xl">
                  <label className="flex items-center gap-3 font-medium text-white cursor-pointer w-full text-sm">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-emerald-500 bg-zinc-900 border-zinc-700 rounded cursor-pointer"
                    />
                    Seleccionar Todos
                  </label>
                </div>
                
                {/* Lista scrolleable si hay muchos miembros */}
                <div className="max-h-36 overflow-y-auto custom-scrollbar px-1">
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

            {/* Submit */}
            <button
              disabled={!amount || !description || !paidBy || !currencyId || selectedPeople.length == 0 || loading}
              onClick={handleAddExpense}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:bg-emerald-600/30 disabled:text-white/50 active:scale-[0.98] flex items-center justify-center"
            >
              {loading ? "Guardando..." : (isEditing ? "Guardar Cambios" : "Confirmar Gasto")}
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