import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CPLife | Sua próxima questão começa aqui",
  description: "Explore e filtre questões do Codeforces para treinar programação competitiva.",
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
