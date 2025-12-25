'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navItems } from '@/lib/nav'

export function MobileNav() {
    const pathname = usePathname()

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-lg border-t border-border/10 flex items-center justify-around px-2 z-50">
            {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-200",
                            isActive
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <item.icon className={cn("w-5 h-5", isActive && "animate-pulse")} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                )
            })}
        </nav>
    )
}
