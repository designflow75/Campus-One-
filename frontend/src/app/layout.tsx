import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusOne | Cashless Canteen & Student Nutrition Management",
  description: "A secure, cashless meal payment and nutrition tracking platform for schools, canteen operators, and parents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        {children}
      </body>
    </html>
  );
}
