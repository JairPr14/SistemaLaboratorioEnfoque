import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sonner } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema LIS",
  description: "Gestión de Laboratorio Clínico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased`}>
        {children}
        <Sonner />
      </body>
    </html>
  );
}
