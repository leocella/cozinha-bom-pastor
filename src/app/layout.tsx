import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cozinha Comunitária",
  description: "Cadastro e presença dos acolhidos da cozinha comunitária.",
};

export const viewport: Viewport = {
  themeColor: "#1F7A5C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
