import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "Rede Fantasma — Restaure o Wi-Fi",
  description:
    "Atravesse labirintos de blocos de placa-mãe, núcleos CPU e rotatórias PCB para restaurar o Wi-Fi da Nova Aurora.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "Rede Fantasma — Restaure o Wi-Fi",
    description:
      "Um minigame A→B em labirintos procedurais com blocos robustos, chips CPU e caminhos de largura variável.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Rede Fantasma — Restaure o Wi-Fi" }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rede Fantasma — Restaure o Wi-Fi",
    description: "Contorne blocos CPU e rotatórias PCB, ligue A a B e restaure a rede da Nova Aurora.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
