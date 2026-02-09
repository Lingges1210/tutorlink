// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "TutorLink – USM Peer Tutoring",
  description:
    "TutorLink is a campus-exclusive peer tutoring platform for Universiti Sains Malaysia students.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
