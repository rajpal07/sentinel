'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth-client'
import { navItems } from '@/lib/nav'

interface SidebarProps {
    user: {
        id: string;
        email: string;
        name?: string;
        emailVerified: boolean;
        image?: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null
}

export function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()

    const handleSignOut = async () => {
        await authClient.signOut()
        router.refresh()
        router.push('/login')
    }

    return (
        <aside className="w-64 h-screen border-r border-border/10 bg-sidebar/50 backdrop-blur-xl fixed left-0 top-0 hidden md:flex flex-col z-50">
            <div className="p-6">
                <h2 className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                    SENTINEL
                </h2>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "")} />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-border/10 space-y-2">
                {user && (
                    <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5 border border-white/5">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">
                                {user.email?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                                {user.email}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                Free Plan
                            </p>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                >
                    <LogOut className="w-5 h-5" />
                    Disconnect
                </button>
            </div>
        </aside>
    )
}
