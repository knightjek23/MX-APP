import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Lora } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { HeaderNav } from "@/components/header-nav";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Lora — brand serif. Used for the Legible wordmark and primary CTAs per
// Figma spec (nodes 16:12154 and 16:12137).
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Legible: AX audits for Figma",
  description:
    "Audit your Figma files for Agentic Experience issues so AI agents can read your designs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={cn(
          "h-full",
          "antialiased",
          geistSans.variable,
          geistMono.variable,
          lora.variable,
          "font-sans",
          inter.variable
        )}
      >
        <body className="min-h-full flex flex-col">
          <HeaderNav />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
