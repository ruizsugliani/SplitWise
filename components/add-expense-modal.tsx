"use client";

import { useEffect, useState } from "react";
import { ReceiptText, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Expense } from "@/app/types/expense";
import ToastConfirm from "./ui/toast-confirmation";
import { Currency } from "@/app/types/currency";

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
  return (
    <>
      {!onCloseExternal && (
        <button
          className="col-span-2 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 py-4 rounded-2xl font-bold transition-all active:scale-[0.98]"
          onClick={() => setIsOpen(true)}
        >
          <ReceiptText className="w-5 h-5" />
          Agregar gasto
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />

          <div className="relative bg-white text-black w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {isEditing ? "Editar Gasto" : "Agregar Gasto"}
              </h2>
              <button
                onClick={closeModal}
                className="text-zinc-400 hover:text-black transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Amount */}
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4">
              <label className="mb-2 block text-sm font-medium text-gray-600">
                Valor
              </label>

              <div className="flex gap-2">
                <div className="flex flex-1 items-center rounded-lg bg-white px-3 py-2">
                  <span className="mr-2 text-gray-500">$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full outline-none"
                  />
                </div>
              </div>
            </div>
            {/* Currency Select */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Moneda
              </label>
              <select
                value={currencyId}
                onChange={(e) => setCurrencyId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 bg-white"
              >
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            {/* Description */}
            <div className="mb-4">
              <label className="text-sm font-bold block mb-2 text-gray-700">
                Descripción
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Descripción del Gasto"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-zinc-100 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              />
            </div>

            {/* Paid by */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Pagado por
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value=""></option>
                {members.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getMemberName(p)}
                  </option>
                ))}
              </select>
            </div>

            {/* Split among */}
            <div className="mb-2">
              <label className="mb-2 block text-sm font-medium text-gray-600">
                Dividir Entre
              </label>

              <div className="rounded-xl border p-3">
                {members.map((p) => {
                  const isSelected = selectedPeople.includes(p.id);

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-2"
                    >
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePerson(p.id)}
                        />
                        {getMemberName(p)}
                      </label>

                      <span className="text-sm text-gray-500">
                        {isSelected
                          ? `$${perPersonAmount.toFixed(2)}`
                          : "$0.00"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="mt-1 text-xs text-gray-500">
                {selectedPeople.length} personas
              </p>
            </div>

            {/* Submit */}
            <button
              disabled={
                !amount || !description || !paidBy || !currencyId || selectedPeople.length == 0
              }
              onClick={handleAddExpense}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? "Guardando..." : "Confirmar"}
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
