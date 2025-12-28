'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Edit, Trash2, XCircle } from 'lucide-react'
import { TradeForm } from '@/components/trading/trade-form'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

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

interface ContextMenuState {
    visible: boolean
    trade: Trade | null
    x: number
    y: number
}

export function RecentTradesList({ trades }: { trades: Trade[] }) {
    const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
    const [formOpen, setFormOpen] = useState(false)
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({
        visible: false,
        trade: null,
        x: 0,
        y: 0
    })
    const [isDeleting, setIsDeleting] = useState(false)
    const longPressTimer = useRef<NodeJS.Timeout | null>(null)
    const router = useRouter()
    const supabase = createClient()

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            if (contextMenu.visible) {
                setContextMenu({ visible: false, trade: null, x: 0, y: 0 })
            }
        }
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [contextMenu.visible])

    const handleTouchStart = (trade: Trade, e: React.TouchEvent) => {
        const touch = e.touches[0]
        longPressTimer.current = setTimeout(() => {
            // Show context menu
            setContextMenu({
                visible: true,
                trade,
                x: touch.clientX,
                y: touch.clientY
            })
            // Haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(50)
            }
        }, 500) // 500ms long press
    }

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current)
        }
    }

    const handleEdit = (trade: Trade) => {
        setEditingTrade(trade)
        setFormOpen(true)
        setContextMenu({ visible: false, trade: null, x: 0, y: 0 })
    }

    const handleDelete = async (trade: Trade) => {
        if (!confirm(`Delete ${trade.symbol} trade?`)) return

        setIsDeleting(true)
        setContextMenu({ visible: false, trade: null, x: 0, y: 0 })

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase
            .from('trades')
            .delete()
            .eq('id', trade.id)
            .eq('user_id', user.id)

        if (error) {
            alert(`Error: ${error.message}`)
        } else {
            router.refresh()
        }
        setIsDeleting(false)
    }

    const handleCloseTrade = (trade: Trade) => {
        // Open edit form with the trade pre-filled, user can add exit price
        setEditingTrade(trade)
        setFormOpen(true)
        setContextMenu({ visible: false, trade: null, x: 0, y: 0 })
    }

    return (
        <div className="space-y-4">
            {trades && trades.length > 0 ? (
                <div className="space-y-4">
                    {trades.map((trade) => (
                        <Card
                            key={trade.id}
                            onTouchStart={(e) => handleTouchStart(trade, e)}
                            onTouchEnd={handleTouchEnd}
                            onTouchCancel={handleTouchEnd}
                            onClick={() => handleEdit(trade)}
                            className="bg-card/30 border-border/30 hover:bg-card/50 transition-colors cursor-pointer active:scale-[0.99] transform duration-100 select-none touch-manipulation"
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
                                        <div className="text-xs text-muted-foreground truncate" suppressHydrationWarning>{new Date(trade.executed_at).toLocaleString(undefined, {
                                            dateStyle: 'medium',
                                            timeStyle: 'medium'
                                        })}</div>
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

            {/* Context Menu */}
            {contextMenu.visible && contextMenu.trade && (
                <div
                    className="fixed z-50 bg-card border border-border rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        left: `${Math.min(contextMenu.x, window.innerWidth - 200)}px`,
                        top: `${Math.min(contextMenu.y, window.innerHeight - 200)}px`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="py-2 min-w-[180px]">
                        <button
                            onClick={() => handleEdit(contextMenu.trade!)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent transition-colors text-left"
                        >
                            <Edit className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-medium">Edit Trade</span>
                        </button>

                        {contextMenu.trade.status === 'OPEN' && (
                            <button
                                onClick={() => handleCloseTrade(contextMenu.trade!)}
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent transition-colors text-left"
                            >
                                <XCircle className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm font-medium">Close Trade</span>
                            </button>
                        )}

                        <button
                            onClick={() => handleDelete(contextMenu.trade!)}
                            disabled={isDeleting}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-500/10 transition-colors text-left disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4 text-red-400" />
                            <span className="text-sm font-medium text-red-400">
                                {isDeleting ? 'Deleting...' : 'Delete Trade'}
                            </span>
                        </button>
                    </div>
                </div>
            )}

            <TradeForm
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open)
                    if (!open) setEditingTrade(null)
                }}
                onSuccess={() => { }}
                initialData={editingTrade}
            />
        </div>
    )
}
