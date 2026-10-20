import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CPLife",
  description: "Painel pessoal de treino de programação competitiva",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
