import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hope Select",
  description: "Gestão de sala da academia",
};

const CHAVE_TEMA = 'hope-select:tema'

// Roda antes do React hidratar — lê o tema salvo e aplica a classe "dark"
// direto no <html>, evitando o "flash" de tela clara antes de escurecer.
const scriptAntiFlash = `
  try {
    var tema = localStorage.getItem('${CHAVE_TEMA}');
    if (tema === 'dark' || (!tema && matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptAntiFlash }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
