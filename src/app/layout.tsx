import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tazonizer - make a list",
  description:
    "A compassionate space to process your fears and concerns. AI-guided support, practical coping techniques, and a gentle reminder that you're not alone.",
  keywords: ["list making", "manage errunds"],
  // Prevent search engines from indexing sessions — privacy first
  robots: "noindex, nofollow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Prevent zoom on input focus on iOS — important for mobile UX
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-calm-50 text-slate-700 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
