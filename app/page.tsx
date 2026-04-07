import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex flex-col min-h-screen w-full items-center justify-center bg-[#0a0a0a] text-white overflow-hidden">
      
      {/* Fondo decorativo sutil */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_farthest-side_at_50%_50%,#1a1a1a,transparent)] opacity-50" />

      <main className="relative z-10 flex flex-col items-center justify-center px-6 w-full max-w-6xl py-20">

        {/* Hero Section */}
        <div className="flex flex-col items-center text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
            Dividí gastos con amigos, <br /> sin complicaciones.
          </h1>

          <p className="max-w-2xl text-lg md:text-xl text-zinc-400 leading-relaxed">
            La forma más simple de organizar gastos cuentas compartidas, viajes y salidas grupales. 
            Mantené las cuentas claras y la amistad intacta.
          </p>
        </div>

        {/* Acciones principales */}
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center mb-20">
          <Link
            href="/auth/login"
            className="flex h-12 w-full sm:w-auto items-center justify-center rounded-xl bg-blue-600 px-10 text-base font-semibold text-white transition-all hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
          >
            Comenzar ahora
          </Link>
        </div>

        {/* Grid de features basado en Necesidades */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
            <div className="text-blue-500 mb-3 text-xl">📁</div>
            <h3 className="font-semibold mb-2">Múltiples Grupos</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">Definí grupos para cada ocasión: el viaje de verano, la cena del viernes o el alquiler del departamento.</p>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
            <div className="text-blue-500 mb-3 text-xl">➕</div>
            <h3 className="font-semibold mb-2">Gastos Grupales</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">Agregá gastos de forma rápida y sencilla para que nadie se olvide de nada.</p>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
            <div className="text-blue-500 mb-3 text-xl">✉️</div>
            <h3 className="font-semibold mb-2">Invitar Amigos</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">Sumá a tus amigos a los grupos para que todos puedan cargar sus propios gastos.</p>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
            <div className="text-blue-500 mb-3 text-xl">⚖️</div>
            <h3 className="font-semibold mb-2">Repartir Gastos</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">Algoritmos inteligentes para que la división sea justa y equitativa entre todos.</p>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
            <div className="text-blue-500 mb-3 text-xl">🔔</div>
            <h3 className="font-semibold mb-2">Recordatorios y Cierres</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">Alertas de deudas pendientes y cierre de grupos una vez que las cuentas están saldadas.</p>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
            <div className="text-blue-500 mb-3 text-xl">🌍</div>
            <h3 className="font-semibold mb-2">Manejo Multimoneda</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">Ideal para viajes internacionales. Gestioná gastos en diferentes divisas sin perder el control.</p>
          </div>
        </div>
      </main>

      <footer className="w-full py-8 text-center text-xs text-zinc-600">
        © 2026 SplitWise — GDSI 2026 1°C - Grupo 7
      </footer>
    </div>
  );
}