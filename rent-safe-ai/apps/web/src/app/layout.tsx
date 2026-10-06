import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "RentSafe AI — Verified Owner Rentals",
    template: "%s | RentSafe AI",
  },
  description:
    "A trust-first rental marketplace that combines owner identity checks, property verification, fraud signals, and human review.",
  applicationName: "RentSafe AI",
  keywords: [
    "rental fraud prevention",
    "verified property owner",
    "property verification",
    "tenant safety",
    "rental marketplace",
    "India rentals",
  ],
  openGraph: {
    title: "RentSafe AI — Verified Owner Rentals",
    description:
      "Verify the owner before trusting the listing. AI assists fraud detection; authoritative evidence remains the ownership gate.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RentSafe AI — Verified Owner Rentals",
    description:
      "Trust-first rental verification for owners, renters, and reviewers.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
