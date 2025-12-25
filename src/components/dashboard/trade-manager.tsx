'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Ban } from 'lucide-react'
import { EmotionalGate } from '@/components/trading/emotional-gate'
import { TradeForm } from '@/components/trading/trade-form'

export function TradeManager({ status }: { status: 'ACTIVE' | 'LOCKED' }) {
    const [gateOpen, setGateOpen] = useState(false)
    const [formOpen, setFormOpen] = useState(false)

    const handleGatePass = () => {
        setGateOpen(false)
        setFormOpen(true)
    }

    const handleGateFail = () => {
        // Maybe lock user out?
        // For now just close or show failure state in modal (which it does)
    }

    return (
        <>
            {status === 'ACTIVE' ? (
                <Button size="lg" onClick={() => setGateOpen(true)} className="bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.4)] hover:shadow-[0_0_30px_rgba(var(--primary),0.6)] transition-all cursor-pointer">
                    <Plus className="w-5 h-5 mr-2" />
                    Log New Trade
                </Button>
            ) : (
                <Button size="lg" variant="destructive" disabled className="opacity-80">
                    <Ban className="w-5 h-5 mr-2" />
                    Trading Locked
                </Button>
            )}

            <EmotionalGate
                open={gateOpen}
                onOpenChange={setGateOpen}
                onPass={handleGatePass}
                onFail={handleGateFail}
            />

            <TradeForm
                open={formOpen}
                onOpenChange={setFormOpen}
                onSuccess={() => {
                    // Toast success?
                }}
            />
        </>
    )
}
