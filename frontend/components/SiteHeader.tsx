"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sparkles, Home, Layers, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
    const pathname = usePathname();

    const navItems = [
        { href: "/", label: "Home", icon: Home },
        { href: "/subjects", label: "Subjects", icon: Layers },
    ];

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-slate-950/80 backdrop-blur-sm">
            <div className="container flex h-16 items-center justify-between px-6">
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                            <Sparkles className="h-4 w-4" />
                        </div>
                        <span>Recall.</span>
                    </Link>
                    {pathname !== '/login' && (
                        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-2 transition-colors hover:text-indigo-600",
                                        pathname === item.href
                                            ? "text-indigo-600"
                                            : "text-slate-600 dark:text-slate-400"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    {pathname !== '/login' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                            Logout
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <User className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
