import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SynvoraSessionProvider } from "@/components/providers/session-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Synvora - White-label Shopify Platform",
  description: "Access Shopify's powerful commerce platform in regions without native payment support. Manage your store, track orders, and grow your business under your brand."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SynvoraSessionProvider>{children}</SynvoraSessionProvider>
      </body>
    </html>
  );
}
