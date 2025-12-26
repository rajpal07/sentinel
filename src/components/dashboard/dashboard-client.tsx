'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TradeManager } from '@/components/dashboard/trade-manager'
import { RecentTradesList } from '@/components/dashboard/recent-trades-list'
import { Activity, Shield, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { isWithinTimeWindow, getStartOfLocalDay, formatLocalTime } from '@/lib/date-utils'

interface DashboardClientProps {
    initialTrades: any[]
    rules: any
    isServerLocked: boolean
    serverLockReason: string | null
}

export function DashboardClient({ initialTrades, rules, isServerLocked, serverLockReason }: DashboardClientProps) {
    const [currentTime, setCurrentTime] = useState(new Date())
    const [status, setStatus] = useState<'ACTIVE' | 'LOCKED'>('ACTIVE')

    // Hydration fix for time display
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    // Filter trades for "Today" (Local Time)
    const localStartOfDay = getStartOfLocalDay()
    const todaysTrades = initialTrades.filter(t => {
        const tradeDate = new Date(t.executed_at)
        return tradeDate >= localStartOfDay
    })

    // Sort recent trades for display
    const recentTrades = [...initialTrades].sort((a, b) =>
        new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime()
    ).slice(0, 5)

    // Calculate Stats
    const dailyPnL = todaysTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0)
    const tradesCount = todaysTrades.length

    const rulesMaxLoss = Number(rules?.max_daily_loss) || 500
    const rulesMaxTrades = Number(rules?.max_trades_per_day) || 5

    // Violation Checks
    const isLossViolation = dailyPnL <= -Math.abs(rulesMaxLoss)
    const isTradeCountViolation = tradesCount >= rulesMaxTrades

    // Time Window Check
    const isTimeViolation = !isWithinTimeWindow(rules?.trading_window_start, rules?.trading_window_end)

    const hasViolation = isLossViolation || isTradeCountViolation || isTimeViolation || isServerLocked

    useEffect(() => {
        setStatus(hasViolation ? 'LOCKED' : 'ACTIVE')
    }, [hasViolation])

    if (!mounted) return null // Prevent hydration mismatch on time

    // Win Rate Calculation
    const closedTrades = todaysTrades.filter(t => t.status === 'CLOSED')
    const winningTrades = closedTrades.filter(t => Number(t.pnl) > 0)
    const winRate = closedTrades.length > 0
        ? Math.round((winningTrades.length / closedTrades.length) * 100)
        : 0

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Trading Terminal</h1>
                    <p className="text-muted-foreground">Session Active • {formatLocalTime(currentTime)}</p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Compact System Status */}
                    <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${status === 'ACTIVE'
                        ? 'bg-green-500/10 border-green-500/20 text-green-500'
                        : 'bg-red-500/10 border-red-500/20 text-red-500'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${status === 'ACTIVE' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-xs font-bold tracking-wider">
                            {status === 'ACTIVE' ? 'SYSTEM ONLINE' : 'LOCKDOWN ACTIVE'}
                        </span>
                    </div>

                    <TradeManager status={status} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Combined Stats (2/3 width on large screens) */}
                <Card className="lg:col-span-2 bg-card/40 border-border/50 backdrop-blur-sm shadow-lg overflow-hidden">
                    <CardHeader className="pb-4 border-b border-border/50">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            <CardTitle>Session Performance</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-border/50">
                            {/* PnL Section */}
                            <div className="p-6 flex flex-col items-center justify-center text-center relative group">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">Daily PnL</span>
                                <div className={`text-4xl font-black tracking-tight ${dailyPnL >= 0 ? "text-green-400" : "text-red-400"}`}>
                                    {dailyPnL >= 0 ? "+" : ""}${dailyPnL.toFixed(2)}
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>Limit: -${rulesMaxLoss}</span>
                                    {isLossViolation && <AlertTriangle className="w-3 h-3 text-red-500" />}
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
                                    <div
                                        className={`h-full transition-all duration-500 ${dailyPnL < 0 ? 'bg-red-500' : 'bg-green-500'}`}
                                        style={{ width: `${Math.min(Math.abs(dailyPnL) / rulesMaxLoss * 100, 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Trades Section */}
                            <div className="p-6 flex flex-col items-center justify-center text-center">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">Trades Executed</span>
                                <div className={`text-4xl font-black tracking-tight ${isTradeCountViolation ? "text-red-500" : "text-foreground"}`}>
                                    {tradesCount} <span className="text-xl text-muted-foreground font-normal">/ {rulesMaxTrades}</span>
                                </div>
                                <div className="mt-3 text-xs text-muted-foreground">
                                    {rulesMaxTrades - tradesCount} remaining
                                </div>
                            </div>

                            {/* Win Rate Section */}
                            <div className="p-6 flex flex-col items-center justify-center text-center">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">Win Rate</span>
                                <div className="text-4xl font-black tracking-tight text-purple-400">
                                    {winRate}%
                                </div>
                                <div className="mt-3 text-xs text-muted-foreground">
                                    {winningTrades.length}W - {closedTrades.length - winningTrades.length}L
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column: Protocols/Rules */}
                <Card className="bg-card/40 border-border/50 backdrop-blur-sm shadow-lg flex flex-col h-full">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                <CardTitle>Active Protocols</CardTitle>
                            </div>
                            {hasViolation && <span className="text-[10px] font-bold bg-red-500/20 text-red-500 px-2 py-1 rounded">VIOLATION</span>}
                        </div>
                        <CardDescription>Strict enforcement enabled</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">

                        {/* Server Lock / Emotional Gate Display */}
                        {isServerLocked && (
                            <div className="p-3 rounded-lg border flex items-center justify-between bg-red-500/10 border-red-500/50">
                                <div className="flex items-center gap-3">
                                    <XCircle className="w-4 h-4 text-red-500" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-red-400">Protocol Lock</span>
                                        <span className="text-xs text-muted-foreground">
                                            {serverLockReason === 'EMOTIONAL_CHECK_FAILED' ? 'Emotional Gate Failure' : 'System Lockdown'}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-sm font-mono text-red-500 font-bold">LOCKED</span>
                            </div>
                        )}

                        {/* Daily Loss Rule */}
                        <div className={`p-3 rounded-lg border flex items-center justify-between ${isLossViolation
                            ? 'bg-red-500/10 border-red-500/50'
                            : 'bg-background/50 border-border/50'
                            }`}>
                            <div className="flex items-center gap-3">
                                {isLossViolation ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500/50" />}
                                <div className="flex flex-col">
                                    <span className={`text-sm font-medium ${isLossViolation ? 'text-red-400' : 'text-foreground'}`}>Max Daily Loss</span>
                                    <span className="text-xs text-muted-foreground">Hard stop at -${rulesMaxLoss}</span>
                                </div>
                            </div>
                            <span className={`text-sm font-mono ${isLossViolation ? 'text-red-500 font-bold' : ''}`}>
                                ${Math.abs(dailyPnL).toFixed(2)}
                            </span>
                        </div>

                        {/* Trade Frequency Rule */}
                        <div className={`p-3 rounded-lg border flex items-center justify-between ${isTradeCountViolation
                            ? 'bg-red-500/10 border-red-500/50'
                            : 'bg-background/50 border-border/50'
                            }`}>
                            <div className="flex items-center gap-3">
                                {isTradeCountViolation ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500/50" />}
                                <div className="flex flex-col">
                                    <span className={`text-sm font-medium ${isTradeCountViolation ? 'text-red-400' : 'text-foreground'}`}>Frequency Cap</span>
                                    <span className="text-xs text-muted-foreground">Max {rulesMaxTrades} trades/day</span>
                                </div>
                            </div>
                            <span className={`text-sm font-mono ${isTradeCountViolation ? 'text-red-500 font-bold' : ''}`}>
                                {tradesCount}
                            </span>
                        </div>

                        {/* Trading Window Rule */}
                        <div className={`p-3 rounded-lg border flex items-center justify-between ${isTimeViolation
                            ? 'bg-red-500/10 border-red-500/50'
                            : 'bg-background/50 border-border/50'
                            }`}>
                            <div className="flex items-center gap-3">
                                {isTimeViolation ? <Clock className="w-4 h-4 text-red-500" /> : <Clock className="w-4 h-4 text-green-500/50" />}
                                <div className="flex flex-col">
                                    <span className={`text-sm font-medium ${isTimeViolation ? 'text-red-400' : 'text-foreground'}`}>Trading Window</span>
                                    <span className="text-xs text-muted-foreground">{rules?.trading_window_start} - {rules?.trading_window_end}</span>
                                </div>
                            </div>
                            <span className={`text-xs ${isTimeViolation ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                                {isTimeViolation ? (
                                    <div className="flex flex-col items-end">
                                        <span>CLOSED</span>
                                        <span className="text-[10px] opacity-75 whitespace-nowrap">
                                            Opens {(() => {
                                                const startStr = rules?.trading_window_start
                                                if (!startStr) return 'Unknown'

                                                const [startH, startM] = startStr.split(':').map(Number)
                                                // Create date for today's start
                                                const nextStart = new Date()
                                                nextStart.setHours(startH, startM, 0, 0)

                                                // If now is past today's start (and we are closed), it must be tomorrow
                                                // Unless we are closed BEFORE today's start.
                                                // But if we are closed, we are either before start OR after end.
                                                // If now < start, next open is today.
                                                // If now > end, next open is tomorrow.

                                                const now = new Date()
                                                if (now < nextStart) {
                                                    return `Today at ${startStr}`
                                                } else {
                                                    // It's tomorrow
                                                    return `Tomorrow at ${startStr}`
                                                }
                                            })()}
                                        </span>
                                    </div>
                                ) : 'OPEN'}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Ledger */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-muted-foreground" />
                    Recent Activity
                </h2>
                <RecentTradesList trades={recentTrades} />
            </div>
        </div>
    )
}
