import type { Metadata } from "next";
import Link from "next/link";
import AutoSettlement from "@/components/AutoSettlement";
import { WalletProvider } from "@/contexts/WalletContext";
import WalletButton from "@/components/WalletButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignalBond",
  description: "A USDC-backed accountability market for AI trading signals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <WalletProvider>
          <nav className="border-b border-card-border bg-card-bg sticky top-0 z-50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center font-bold text-white text-sm">
                    S
                  </div>
                  <span className="text-lg font-bold text-foreground">
                    SignalBond
                  </span>
                </Link>
                <div className="flex items-center gap-6">
                  <Link
                    href="/"
                    className="text-sm text-muted hover:text-foreground transition-colors"
                  >
                    Signals
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="text-sm text-muted hover:text-foreground transition-colors"
                  >
                    Leaderboard
                  </Link>
                  <Link
                    href="/portfolio"
                    className="text-sm text-muted hover:text-foreground transition-colors"
                  >
                    Portfolio
                  </Link>
                  <Link
                    href="/traction"
                    className="text-sm text-muted hover:text-foreground transition-colors"
                  >
                    Traction
                  </Link>
                  <WalletButton />
                </div>
              </div>
            </div>
          </nav>
          <AutoSettlement />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-card-border py-6 text-center text-sm text-muted">
            SignalBond — AI signals need skin in the game
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
