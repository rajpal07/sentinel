'use client'

import { useState } from 'react'
import { updateRulesAction } from '@/actions/user-actions'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'

export default function OnboardingPage() {
    const [step, setStep] = useState(1)
    const [rules, setRules] = useState({
        max_risk_per_trade_percent: 1 as number | string,
        max_daily_loss: 500 as number | string,
        max_trades_per_day: 5 as number | string,
        trading_window_start: '09:30',
        trading_window_end: '16:00'
    })
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleNext = () => setStep(step + 1)
    const handleBack = () => setStep(step - 1)

    const handleFinish = async () => {
        setLoading(true)

        const numericRules = {
            ...rules,
            max_risk_per_trade_percent: Number(rules.max_risk_per_trade_percent),
            max_daily_loss: Number(rules.max_daily_loss),
            max_trades_per_day: Number(rules.max_trades_per_day),
            setup_complete: true
        }

        const result = await updateRulesAction(numericRules)

        if (result.success) {
            router.push('/dashboard')
        } else {
            alert("Failed to save rules. Try again. " + (result.error || ''))
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            {/* Background */}
            <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />

            <Card className="w-full max-w-lg border-border/50 bg-card/60 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-muted">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
                </div>

                <CardHeader>
                    <CardTitle className="text-2xl text-center">Protocol Configuration</CardTitle>
                    <CardDescription className="text-center">Define your iron-clad rules.</CardDescription>
                </CardHeader>

                <CardContent className="min-h-[300px] flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <h3 className="text-lg font-semibold text-primary">Risk Parameters</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Max Risk Per Trade (%)</Label>
                                        <Input
                                            type="number"
                                            value={rules.max_risk_per_trade_percent}
                                            onChange={(e) => setRules({ ...rules, max_risk_per_trade_percent: e.target.value })}
                                            className="bg-background/50"
                                        />
                                        <p className="text-xs text-muted-foreground">Recommended: 1-2%</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Max Daily Loss ($)</Label>
                                        <Input
                                            type="number"
                                            value={rules.max_daily_loss}
                                            onChange={(e) => setRules({ ...rules, max_daily_loss: e.target.value })}
                                            className="bg-background/50"
                                        />
                                        <p className="text-xs text-muted-foreground">Hard stop for the day.</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <h3 className="text-lg font-semibold text-primary">Trade Volume</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Max Trades Per Day</Label>
                                        <Input
                                            type="number"
                                            value={rules.max_trades_per_day}
                                            onChange={(e) => setRules({ ...rules, max_trades_per_day: e.target.value })}
                                            className="bg-background/50"
                                        />
                                        <p className="text-xs text-muted-foreground">Prevents overtrading.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Start Time</Label>
                                            <Input
                                                type="time"
                                                value={rules.trading_window_start}
                                                onChange={(e) => setRules({ ...rules, trading_window_start: e.target.value })}
                                                className="bg-background/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>End Time</Label>
                                            <Input
                                                type="time"
                                                value={rules.trading_window_end}
                                                onChange={(e) => setRules({ ...rules, trading_window_end: e.target.value })}
                                                className="bg-background/50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6 text-center"
                            >
                                <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-3xl">
                                    🤝
                                </div>
                                <h3 className="text-xl font-bold">The Contract</h3>
                                <p className="text-muted-foreground">
                                    I hereby authorize Sentinel to lock my account immediately if any of these rules are violated. I understand there is no override button.
                                </p>
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
                                    &quot;Friction is intentional.&quot;
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>

                <CardFooter className="flex justify-between">
                    {step > 1 ? (
                        <Button variant="ghost" onClick={handleBack}>Back</Button>
                    ) : (
                        <div />
                    )}

                    {step < 3 ? (
                        <Button onClick={handleNext}>Next</Button>
                    ) : (
                        <Button onClick={handleFinish} disabled={loading} className="bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)] cursor-pointer">
                            {loading ? 'Initializing...' : 'Sign & Initialize'}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}
