import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TradeManager } from '@/components/dashboard/trade-manager'
import { RecentTradesList } from '@/components/dashboard/recent-trades-list'
import { Activity, Shield, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check Setup
    const { data: rules } = await supabase.from('rules').select('*').eq('user_id', user.id).single()
    if (rules && !rules.setup_complete) {
        redirect('/start')
    }

    // Fetch Data
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 1. Fetch Today's Trades (for stats)
    const { data: todaysTrades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('executed_at', today.toISOString())
        .order('executed_at', { ascending: false })

    // 2. Fetch Recent Trades (for ledger)
    const { data: recentTrades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('executed_at', { ascending: false })
        .limit(5)

    // Calculate Stats
    const dailyPnL = todaysTrades?.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0) || 0
    const tradesCount = todaysTrades?.length || 0

    const rulesMaxLoss = Number(rules?.max_daily_loss) || 500
    const rulesMaxTrades = Number(rules?.max_trades_per_day) || 5
    const rulesMaxRisk = Number(rules?.max_risk_per_trade_percent) || 2

    // Violation Checks
    const isLossViolation = dailyPnL <= -Math.abs(rulesMaxLoss)
    const isTradeCountViolation = tradesCount >= rulesMaxTrades

    // Check if within trading window (simple check)
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    let isTimeViolation = false
    if (rules?.trading_window_start && rules?.trading_window_end) {
        const [startH, startM] = rules.trading_window_start.split(':').map(Number)
        const [endH, endM] = rules.trading_window_end.split(':').map(Number)
        const startTime = startH * 60 + startM
        const endTime = endH * 60 + endM

        console.log('--- DEBUG TRADING WINDOW ---')
        console.log('Server Date:', now.toString())
        console.log('CurrentTime (min):', currentTime)
        console.log('Window:', rules.trading_window_start, 'to', rules.trading_window_end)
        console.log('Start (min):', startTime, 'End (min):', endTime)

        // Assume window is within same day for simplicity
        if (currentTime < startTime || currentTime > endTime) {
            isTimeViolation = true
            console.log('VIOLATION DETECTED')
        }
    }

    const hasViolation = isLossViolation || isTradeCountViolation || isTimeViolation
    const status: 'ACTIVE' | 'LOCKED' = hasViolation ? 'LOCKED' : 'ACTIVE'

    // Win Rate Calculation
    const closedTrades = todaysTrades?.filter(t => t.status === 'CLOSED') || []
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
                    <p className="text-muted-foreground">Session Active • {new Date().toLocaleDateString()}</p>
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
                                {isTimeViolation ? 'CLOSED' : 'OPEN'}
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
                <RecentTradesList trades={recentTrades || []} />
            </div>

            {/* DEBUG SECTION */}
            <Card className="bg-yellow-500/10 border-yellow-500/50 p-4">
                <h3 className="font-bold text-yellow-500 mb-2">Debug Info (Take a screenshot/Check this)</h3>
                <pre className="text-xs font-mono text-muted-foreground overflow-auto">
                    {JSON.stringify({
                        serverTime: now.toString(),
                        currentTimeMin: currentTime,
                        windowStart: rules?.trading_window_start,
                        windowEnd: rules?.trading_window_end,
                        isTimeViolation
                    }, null, 2)}
                </pre>
            </Card>
        </div>
    )
}
