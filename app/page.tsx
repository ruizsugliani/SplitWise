import Image from "next/image";
import Link from "next/link";
import { FeatureCard, } from '@/components/ui/feature-card'
import { FEATURES } from '@/data/features'

export default function Home() {
  return (
    <div className="relative flex flex-col min-h-screen w-full items-center justify-center bg-[#0a0a0a] text-white overflow-hidden">
      
      {/* Fondo decorativo sutil */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_farthest-side_at_50%_50%,#1a1a1a,transparent)] opacity-50" />

      <main className="relative z-10 flex flex-col items-center justify-center px-6 w-full max-w-6xl py-20">

        {/* Hero Section */}
        <div className="flex flex-col items-center text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
            Dividí gastos sin complicaciones.
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
          {FEATURES.map((feature, index) => (
            <FeatureCard 
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </main>

      <footer className="w-full py-8 text-center text-xs text-zinc-600">
        © 2026 SplitWise — GDSI 2026 1°C - Grupo 7
      </footer>
    </div>
  );
}