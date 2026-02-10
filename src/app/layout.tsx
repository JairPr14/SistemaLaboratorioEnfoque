import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sonner } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
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
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme-preference');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=t||(d?'dark':'light');document.documentElement.classList.toggle('dark',r==='dark')})()`,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          <SessionProvider>
            {children}
            <Sonner />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
