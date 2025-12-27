import { LayoutDashboard, ShieldAlert, History, Settings } from 'lucide-react'

export const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/violations', label: 'Violations', icon: ShieldAlert },
    { href: '/dashboard/history', label: 'History', icon: History },
    { href: '/dashboard/settings', label: 'Rules & Settings', icon: Settings },
]
