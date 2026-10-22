import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Biblioteka — księgozbiór domowy",
  description: "Domowa biblioteka: książki, wypożyczenia i etykiety",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${sourceSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-charcoal">{children}</body>
    </html>
  );
}
