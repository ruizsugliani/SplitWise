import Link from "next/link";

interface SpendingGroupCardProps {
  id: string;
  icon: React.ReactNode; // Cambiado para aceptar cualquier elemento visual
  name: string;
  members: number;
  expenses_count: number;
  total_amount: string;
}

export function SpendingGroupCard({ id, icon, name, members, expenses_count, total_amount }: SpendingGroupCardProps) {
  return (
    <Link href={`/spending-groups/${id}`}>
      <div className="flex items-center mt-2 mb-2 p-4 bg-[#171717] rounded-2xl border border-white/10 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99]">
        <div className="w-14 h-14 flex items-center justify-center text-3xl bg-white/5 rounded-xl mr-4 group-hover:bg-blue-500/10 transition-colors">
          {icon}
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-lg leading-tight text-white">{name}</h3>
          <div className="flex items-center gap-3 text-sm text-zinc-400 mt-1">
            <span className="flex items-center gap-1">👥 {members} members</span>
            <span className="flex items-center gap-1">• {expenses_count} expenses</span>
          </div>
          <div className="text-emerald-400 font-bold mt-2 flex items-center gap-1">
            <span className="text-xs">💰</span> {total_amount}
          </div>
        </div>

        <div className="text-zinc-700 font-light text-2xl group-hover:text-blue-500 transition-colors">
          ›
        </div>
      </div>
    </Link>
  );
}