import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "SplitWise",
  description: "Repartí gastos fácilmente con tu grupo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} bg-[#0a0a0a] text-white antialiased min-h-full flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
