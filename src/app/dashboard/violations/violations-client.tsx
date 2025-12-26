'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Lock, ShieldAlert, ArrowLeft, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { isWithinTimeWindow } from '@/lib/date-utils'

interface ViolationsClientProps {
    rules: any
    tradesBuffer: any[] // Last 48h trades
    recentLocks: any[]  // Recent locks
}

export function ViolationsClient({ rules, tradesBuffer, recentLocks }: ViolationsClientProps) {
    const [mounted, setMounted] = useState(false)
    const [localState, setLocalState] = useState({
        dailyPnL: 0,
        tradesCount: 0,
        isLossViolation: false,
        isTradeCountViolation: false,
        isServerLock: false,
        isTimeViolation: false,
        lockReason: null as string | null
    })

    useEffect(() => {
        setMounted(true)

        // 1. Determine Local Midnight
        const now = new Date()
        const localMidnight = new Date(now)
        localMidnight.setHours(0, 0, 0, 0)

        // 2. Filter Trades for "Today" (Local)
        const todaysTrades = tradesBuffer.filter(t => new Date(t.executed_at) >= localMidnight)
        const dailyPnL = todaysTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0)
        const tradesCount = todaysTrades.length

        // 3. Determine "Today's Lock" (Local Date String YYYY-MM-DD using Local Time)
        // We allow both Local Date AND UTC Date matches to be safe (Conservative Lock)
        // because the DB lock is always UTC CURRENT_DATE.
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const localDateStr = `${year}-${month}-${day}`

        const utcDateStr = now.toISOString().split('T')[0] // Fallback

        const activeLock = recentLocks.find(l =>
            l.lock_date === localDateStr || l.lock_date === utcDateStr
        )

        // 4. Time Window Check
        const isTimeViolation = rules?.trading_window_start && rules?.trading_window_end
            ? !isWithinTimeWindow(rules.trading_window_start, rules.trading_window_end)
            : false

        // 5. Rules Check
        const rulesMaxLoss = Number(rules?.max_daily_loss) || 500
        const rulesMaxTrades = Number(rules?.max_trades_per_day) || 5

        const isLossViolation = dailyPnL <= -Math.abs(rulesMaxLoss)
        const isTradeCountViolation = tradesCount >= rulesMaxTrades
        const isServerLock = !!activeLock

        setLocalState({
            dailyPnL,
            tradesCount,
            isLossViolation,
            isTradeCountViolation,
            isServerLock,
            isTimeViolation,
            lockReason: activeLock?.reason || null
        })

    }, [tradesBuffer, recentLocks, rules])

    if (!mounted) return null // Avoid hydration mismatch

    const { isLossViolation, isTradeCountViolation, isServerLock, isTimeViolation, lockReason, dailyPnL, tradesCount } = localState
    const hasViolation = isLossViolation || isTradeCountViolation || isServerLock || isTimeViolation

    if (!hasViolation) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 p-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-green-500 blur-3xl opacity-20 animate-pulse rounded-full" />
                    <ShieldCheck className="w-24 h-24 text-green-500 relative z-10" />
                </div>
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-black text-green-500 tracking-tighter uppercase">System Nominal</h1>
                    <p className="text-muted-foreground font-mono">No active protocol violations detected.</p>
                </div>
                <Link href="/dashboard">
                    <Button variant="outline" className="gap-2">
                        <ArrowLeft className="w-4 h-4" /> Return to Dashboard
                    </Button>
                </Link>
            </div>
        )
    }

    // Determine Violation Details
    let violationReason = "Unknown Violation"
    let violationLimit = "$0.00"
    let violationActual = "$0.00"
    const rulesMaxLoss = Number(rules?.max_daily_loss) || 500
    const rulesMaxTrades = Number(rules?.max_trades_per_day) || 5

    if (isServerLock) {
        violationReason = lockReason === 'EMOTIONAL_CHECK_FAILED' ? "Emotional Gate Failure" : "Protocol Lockdown"
        violationLimit = "Strict Protocol"
        violationActual = "Locked"
    } else if (isLossViolation) {
        violationReason = "Daily Loss Limit Exceeded"
        violationLimit = "-$" + rulesMaxLoss.toFixed(2)
        violationActual = "-$" + Math.abs(dailyPnL).toFixed(2)
    } else if (isTradeCountViolation) {
        violationReason = "Max Daily Trades Exceeded"
        violationLimit = rulesMaxTrades.toString() + " Trades"
        violationActual = tradesCount.toString() + " Trades"
    } else if (isTimeViolation) {
        violationReason = "Trading Window Closed"
        violationLimit = `${rules.trading_window_start} - ${rules.trading_window_end}`
        violationActual = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 p-4">
            <div className="relative">
                <div className="absolute inset-0 bg-red-500 blur-3xl opacity-20 animate-pulse rounded-full" />
                <ShieldAlert className="w-24 h-24 text-red-500 relative z-10" />
            </div>

            <div className="text-center space-y-2">
                <h1 className="text-4xl font-black text-red-500 tracking-tighter uppercase">Protocol Violation</h1>
            </div>

            <Card className="w-full max-w-md bg-card/60 border-red-500/30 backdrop-blur-xl shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="flex items-center justify-center gap-2 text-red-400">
                        <Lock className="w-4 h-4" />
                        Account Locked
                    </CardTitle>
                    <CardDescription>
                        Trading privileges have been suspended.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Violation</span>
                            <span className="font-bold text-red-200">{violationReason}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Time</span>
                            <span className="font-mono">{new Date().toLocaleTimeString()}</span>
                        </div>
                        <div className="h-px bg-red-500/20 my-2" />
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Limit</span>
                            <span className="font-mono text-green-400">{violationLimit}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Actual</span>
                            <span className="font-mono text-red-400 font-bold">{violationActual}</span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Button className="w-full bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]" disabled>
                        <Lock className="w-4 h-4 mr-2" />
                        Unlock Unavailable
                    </Button>
                    <Link href="/dashboard" className="w-full">
                        <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Return to Dashboard
                        </Button>
                    </Link>
                </CardFooter>
            </Card>

            <div className="max-w-md text-center text-xs text-muted-foreground">
                <p>
                    {isServerLock && lockReason === 'EMOTIONAL_CHECK_FAILED' ?
                        `"The market is a device for transferring money from the impatient to the patient."` :
                        isLossViolation ?
                            `"The goal of a successful trader is to make the best trades. Money is secondary."` :
                            `"It is better to do nothing than to do what is wrong. For whatever you do, do it to no purpose."`}
                </p>
            </div>
        </div>
    )
}
