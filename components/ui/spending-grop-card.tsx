import Link from "next/link";
import { Users, Receipt, ChevronRight } from "lucide-react";

interface SpendingGroupCardProps {
  id: string;
  icon: React.ReactNode;
  name: string;
  members: number;
  expenses_count: number;
  total_amount: string;
}

export function SpendingGroupCard({ id, icon, name, members, expenses_count, total_amount }: SpendingGroupCardProps) {
  return (
    // Agregamos 'block' al Link por buenas prácticas
    <Link href={`/spending-groups/${id}`} className="block">
      
      {/* 1. AGREGAMOS LA CLASE 'group' ACÁ */}
      <div className="group flex items-center p-4 bg-zinc-900/40 hover:bg-zinc-900/60 rounded-2xl border border-white/5 shadow-sm transition-all duration-300 hover:border-white/10 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]">
        
        {/* Ícono del Grupo (Emoji principal) */}
        <div className="w-14 h-14 flex items-center justify-center text-3xl bg-black/50 border border-white/5 rounded-2xl mr-4 group-hover:scale-110 transition-transform duration-300 shadow-inner shrink-0">
          {icon}
        </div>

        {/* Información Central */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg leading-tight text-white truncate">{name}</h3>
          
          <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1.5 font-medium">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> 
              {members} miembros
            </span>
            <span className="flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> 
              {expenses_count} gastos
            </span>
          </div>
          
          <div className="text-emerald-400 font-bold mt-2 text-base tracking-tight">
            {total_amount}
          </div>
        </div>

        {/* Flecha de Navegación */}
        <div className="text-zinc-600 group-hover:text-white transition-all ml-2 shrink-0 group-hover:translate-x-1 duration-300">
          <ChevronRight className="w-6 h-6" />
        </div>
        
      </div>
    </Link>
  );
}