'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

interface MobileHeaderProps {
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

export function MobileHeader({ user }: MobileHeaderProps) {
    const router = useRouter()

    const handleSignOut = async () => {
        await authClient.signOut()
        router.refresh()
        router.push('/login')
    }

    return (
        <header className="md:hidden fixed top-0 left-0 right-0 h-16 px-4 flex items-center justify-between bg-background/80 backdrop-blur-xl border-b border-white/5 z-50">
            {/* Logo */}
            <span className="text-xl font-bold tracking-tighter bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                SENTINEL
            </span>

            {/* User Profile Pill */}
            <div className="flex items-center gap-3">
                {user && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-primary">
                                {user.email?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground max-w-[100px] truncate">
                            {user.email}
                        </span>
                    </div>
                )}

                {/* Logout Button */}
                <button
                    onClick={handleSignOut}
                    className="p-2 -mr-2 text-muted-foreground hover:text-white hover:bg-white/5 rounded-full transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    )
}
