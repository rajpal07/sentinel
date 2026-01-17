'use client'

import { useState, useEffect } from 'react'
import { updateRulesAction, getUserRulesAction } from '@/actions/user-actions'
import { authClient } from '@/lib/auth-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, Shield, LogOut } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
    const [rules, setRules] = useState({
        max_risk_per_trade_percent: 0 as number | string,
        max_daily_loss: 0 as number | string,
        max_trades_per_day: 0 as number | string,
        trading_window_start: '09:30',
        trading_window_end: '16:00',
        timezone: 'UTC'
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const fetchRules = async () => {
            const result = await getUserRulesAction()
            if (result.success && result.data) {
                const data = result.data
                setRules({
                    max_risk_per_trade_percent: data.max_risk_per_trade_percent,
                    max_daily_loss: data.max_daily_loss,
                    max_trades_per_day: data.max_trades_per_day,
                    trading_window_start: data.trading_window_start,
                    trading_window_end: data.trading_window_end,
                    timezone: data.timezone || 'UTC'
                })
            }
            setLoading(false)
        }
        fetchRules()
    }, [])

    const handleSave = async () => {
        setSaving(true)

        // Convert string values back to numbers for storage
        const updatedRules = {
            ...rules,
            max_risk_per_trade_percent: Number(rules.max_risk_per_trade_percent),
            max_daily_loss: Number(rules.max_daily_loss),
            max_trades_per_day: Number(rules.max_trades_per_day)
        }

        const result = await updateRulesAction(updatedRules)

        if (!result.success) {
            toast.error("Failed to save settings: " + result.error)
        } else {
            toast.success("Protocol updated successfully")
        }
        setSaving(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
                <p className="text-muted-foreground">Adjust your risk parameters and trading constraints.</p>
            </div>

            <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        <CardTitle>Risk Protocols</CardTitle>
                    </div>
                    <CardDescription>
                        These rules are enforced by the Sentinel engine.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    <div className="space-y-2">
                        <Label>Timezone Authority</Label>
                        <Select value={rules.timezone} onValueChange={(val) => setRules({ ...rules, timezone: val })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Timezone" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="UTC">UTC (Universal)</SelectItem>
                                <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                                <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                                <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                                <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                                <SelectItem value="Australia/Sydney">Australia/Sydney (AEST)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                            Defines when your "Daily" PnL and Trade Count resets.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Max Risk Per Trade (%)</Label>
                            <Input
                                type="number"
                                value={rules.max_risk_per_trade_percent}
                                onChange={(e) => setRules({ ...rules, max_risk_per_trade_percent: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">Percentage of total account balance.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Max Daily Loss ($)</Label>
                            <Input
                                type="number"
                                value={rules.max_daily_loss}
                                onChange={(e) => setRules({ ...rules, max_daily_loss: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">Absolute dollar value lockout trigger.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Max Trades Per Day</Label>
                            <Input
                                type="number"
                                value={rules.max_trades_per_day}
                                onChange={(e) => setRules({ ...rules, max_trades_per_day: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">Hard cap on trade frequency.</p>
                        </div>
                    </div>

                    <div className="border-t border-border/50 pt-6">
                        <h4 className="text-sm font-semibold mb-4">Active Trading Window</h4>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Start Time</Label>
                                <Input
                                    type="time"
                                    className="[color-scheme:dark]"
                                    value={rules.trading_window_start}
                                    onChange={(e) => setRules({ ...rules, trading_window_start: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Time</Label>
                                <Input
                                    type="time"
                                    className="[color-scheme:dark]"
                                    value={rules.trading_window_end}
                                    onChange={(e) => setRules({ ...rules, trading_window_end: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t border-border/50 pt-6">
                    <p className="text-xs text-muted-foreground max-w-[60%]">
                        Changes to risk parameters take effect immediately. Be aware that tightening rules while in a trade may trigger immediate violations.
                    </p>
                    <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </CardFooter>
            </Card>

            <Card className="border-border/50 bg-card/40 backdrop-blur-sm border-red-500/20">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <LogOut className="w-5 h-5 text-red-400" />
                        <CardTitle className="text-red-400">Account</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Sign Out</p>
                            <p className="text-xs text-muted-foreground">End your current session.</p>
                        </div>
                        <Button variant="destructive" className="cursor-pointer" onClick={async () => {
                            await authClient.signOut()
                            window.location.href = '/login'
                        }}>
                            Sign Out
                        </Button>
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}
