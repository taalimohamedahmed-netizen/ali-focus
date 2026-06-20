import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/AppContext";
import { ToastProvider } from "@/lib/toast";

export const metadata: Metadata = {
  title: "Ali Focus",
  description: "Shared team focus tracker — daily plans, sessions, tasks, deadlines, streaks, and progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <ToastProvider>
          <AppProvider>{children}</AppProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
