'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Ban } from 'lucide-react'
import { EmotionalGate } from '@/components/trading/emotional-gate'
import { TradeForm } from '@/components/trading/trade-form'

import { lockSessionAction } from '@/actions/user-actions'
import { useRouter } from 'next/navigation'

export function TradeManager({ status }: { status: 'ACTIVE' | 'LOCKED' }) {
    const [gateOpen, setGateOpen] = useState(false)
    const [formOpen, setFormOpen] = useState(false)

    const handleGatePass = () => {
        setGateOpen(false)
        setFormOpen(true)
    }

    const router = useRouter()

    const handleGateFail = async () => {
        try {
            await lockSessionAction('EMOTIONAL_CHECK_FAILED')
        } catch (e) {
            console.error("Exception during lock:", e)
        }

        // Lock user out persistently
        setGateOpen(false)
        router.refresh()
    }

    return (
        <>
            {status === 'ACTIVE' ? (
                <Button
                    size="lg"
                    onClick={() => setGateOpen(true)}
                    className="bg-gradient-to-r from-indigo-500 via-primary to-purple-600 text-white border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold tracking-wide"
                >
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
