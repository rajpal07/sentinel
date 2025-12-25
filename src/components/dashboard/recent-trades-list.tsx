'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { TradeForm } from '@/components/trading/trade-form'

interface Trade {
    id: string
    symbol: string
    direction: string
    entry_price: number
    exit_price: number | null
    size: number
    risk_amount: number
    status: string
    executed_at: string
    pnl: number | null
}

export function RecentTradesList({ trades }: { trades: Trade[] }) {
    const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
    const [formOpen, setFormOpen] = useState(false)

    const handleEdit = (trade: Trade) => {
        setEditingTrade(trade)
        setFormOpen(true)
    }

    return (
        <div className="space-y-4">
            {trades && trades.length > 0 ? (
                <div className="space-y-4">
                    {trades.map((trade) => (
                        <Card
                            key={trade.id}
                            onClick={() => handleEdit(trade)}
                            className="bg-card/30 border-border/30 hover:bg-card/50 transition-colors cursor-pointer active:scale-[0.99] transform duration-100"
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className={`p-2 rounded-full ${trade.direction === 'LONG' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} shrink-0`}>
                                        {trade.direction === 'LONG' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold flex items-center gap-2 truncate">
                                            {trade.symbol}
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${trade.status === 'CLOSED'
                                                ? 'border-muted-foreground/30 text-muted-foreground'
                                                : 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                                                } shrink-0`}>
                                                {trade.status}
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate" suppressHydrationWarning>{new Date(trade.executed_at).toLocaleString()}</div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                    <div className="font-mono text-sm">{trade.size} @ {trade.entry_price}</div>
                                    {trade.status === 'CLOSED' && trade.pnl !== null ? (
                                        <div className={`text-xs font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-muted-foreground" title={`Risk: $${trade.risk_amount.toFixed(2)}`}>
                                            SL: {trade.direction === 'LONG'
                                                ? (trade.entry_price - (trade.risk_amount / trade.size)).toFixed(2)
                                                : (trade.entry_price + (trade.risk_amount / trade.size)).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="bg-card/30 border-dashed border-border/30 h-64 flex items-center justify-center text-muted-foreground">
                    No trades logged yet.
                </Card>
            )}

            <TradeForm
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open)
                    if (!open) setEditingTrade(null) // Reset on close
                }}
                onSuccess={() => { }}
                initialData={editingTrade}
            />
        </div>
    )
}
