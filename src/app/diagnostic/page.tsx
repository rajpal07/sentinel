'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function DiagnosticPage() {
    const [email, setEmail] = useState('xyz@xyz.com')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const supabase = createClient()

    const checkUser = async () => {
        setLoading(true)
        setResult(null)

        try {
            const now = new Date()
            const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')

            // Get current user (must be logged in as admin)
            const { data: { user: currentUser } } = await supabase.auth.getUser()

            if (!currentUser) {
                setResult({ error: 'You must be logged in to use this diagnostic tool' })
                setLoading(false)
                return
            }

            // Try to get all users (will fail with anon key)
            const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()

            let targetUserId = null

            if (usersError) {
                setResult({
                    error: 'Cannot access user list. This requires service role key.',
                    suggestion: 'Please check Supabase dashboard directly or log in as the user to see their status.',
                    currentUser: currentUser.email
                })
                setLoading(false)
                return
            }

            const targetUser = users?.find(u => u.email === email)

            if (!targetUser) {
                setResult({
                    error: `User ${email} not found`,
                    availableUsers: users?.map(u => u.email) || []
                })
                setLoading(false)
                return
            }

            targetUserId = targetUser.id

            // Get user's rules
            const { data: rules, error: rulesErr } = await supabase
                .from('rules')
                .select('*')
                .eq('user_id', targetUserId)
                .single()

            if (rulesErr) {
                setResult({ error: 'Error fetching rules: ' + rulesErr.message })
                setLoading(false)
                return
            }

            // Check if within trading window
            const currentMinutes = now.getHours() * 60 + now.getMinutes()
            const [startH, startM] = rules.trading_window_start.split(':').map(Number)
            const [endH, endM] = rules.trading_window_end.split(':').map(Number)
            const startMinutes = startH * 60 + startM
            const endMinutes = endH * 60 + endM
            const isWithinWindow = currentMinutes >= startMinutes && currentMinutes <= endMinutes

            // Get today's trades
            const todayStart = new Date()
            todayStart.setHours(0, 0, 0, 0)

            const { data: trades, error: tradesErr } = await supabase
                .from('trades')
                .select('*')
                .eq('user_id', targetUserId)
                .gte('executed_at', todayStart.toISOString())
                .order('executed_at', { ascending: false })

            const dailyPnL = trades?.reduce((sum, t) => sum + (t.pnl || 0), 0) || 0

            // Check for daily locks
            const today = new Date().toISOString().split('T')[0]
            const { data: dailyLock } = await supabase
                .from('daily_locks')
                .select('*')
                .eq('user_id', targetUserId)
                .eq('lock_date', today)
                .single()

            // Calculate violations
            const violations = []
            if (dailyPnL <= -(rules.max_daily_loss)) {
                violations.push(`Daily Loss Limit (PnL: $${dailyPnL.toFixed(2)} <= -$${rules.max_daily_loss})`)
            }
            if ((trades?.length || 0) >= rules.max_trades_per_day) {
                violations.push(`Trade Count Limit (${trades?.length} >= ${rules.max_trades_per_day})`)
            }
            if (!isWithinWindow) {
                violations.push('Trading Window Closed')
            }

            setResult({
                user: {
                    email: targetUser.email,
                    id: targetUserId
                },
                rules: {
                    maxRiskPerTrade: rules.max_risk_per_trade + '%',
                    maxDailyLoss: '$' + rules.max_daily_loss,
                    maxTradesPerDay: rules.max_trades_per_day,
                    tradingWindow: `${rules.trading_window_start} - ${rules.trading_window_end}`,
                    setupComplete: rules.setup_complete
                },
                timeCheck: {
                    currentTime,
                    windowStart: rules.trading_window_start,
                    windowEnd: rules.trading_window_end,
                    isWithinWindow
                },
                trades: {
                    count: trades?.length || 0,
                    dailyPnL: dailyPnL.toFixed(2)
                },
                lock: dailyLock ? {
                    locked: true,
                    reason: dailyLock.reason,
                    lockedAt: new Date(dailyLock.created_at).toLocaleString()
                } : {
                    locked: false
                },
                violations,
                systemStatus: violations.length > 0 ? 'LOCKDOWN ACTIVE' : 'NOMINAL'
            })

        } catch (error: any) {
            setResult({ error: error.message })
        }

        setLoading(false)
    }

    return (
        <div className="container mx-auto p-8 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle>User Diagnostic Tool</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>User Email</Label>
                        <Input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@example.com"
                        />
                    </div>
                    <Button onClick={checkUser} disabled={loading}>
                        {loading ? 'Checking...' : 'Check Status'}
                    </Button>

                    {result && (
                        <div className="mt-6 p-4 bg-muted rounded-lg">
                            <pre className="text-xs overflow-auto">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
