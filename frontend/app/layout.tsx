import { Inter } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css"; // Math support
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/SiteHeader";

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
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
