import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Recall",
  description: "AI-Powered Revision Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "min-h-screen bg-slate-50 text-slate-900 antialiased")}>
        <nav className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <Link href="/" className="font-bold text-xl tracking-tight">Recall.</Link>
          <div className="flex gap-4 text-sm font-medium text-slate-500">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Link href="/subjects" className="hover:text-slate-900 transition-colors">Subjects</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
