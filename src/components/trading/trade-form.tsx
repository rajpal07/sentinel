'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/utils/supabase/client'
import { Loader2, Search, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FieldHint } from '@/components/ui/field-hint'
import { searchSymbols, getQuote, FinnhubSymbol } from '@/lib/finnhub'

interface Trade {
    id: string
    symbol: string
    direction: string
    entry_price: number | null
    exit_price: number | null
    size: number | null
    risk_amount: number | null
    status: string
}

interface TradeFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    initialData?: Trade | null;
}

export function TradeForm({ open, onOpenChange, onSuccess, initialData }: TradeFormProps) {
    const [formData, setFormData] = useState({
        symbol: '',
        direction: 'LONG',
        entry_price: '',
        exit_price: '',
        size: '',
        stop_loss: ''
    })

    useEffect(() => {
        if (initialData) {
            setFormData({
                symbol: initialData.symbol || '',
                direction: initialData.direction || 'LONG',
                entry_price: initialData.entry_price?.toString() || '',
                exit_price: initialData.exit_price?.toString() || '',
                size: initialData.size?.toString() || '',
                // Calculate Stop Loss from Risk if editing: Entry - (Risk / Size) for LONG, Entry + (Risk / Size) for SHORT
                stop_loss: (initialData.entry_price && initialData.risk_amount && initialData.size)
                    ? (initialData.direction === 'LONG'
                        ? (initialData.entry_price - (initialData.risk_amount / initialData.size)).toString()
                        : (initialData.entry_price + (initialData.risk_amount / initialData.size)).toString())
                    : ''
            })
        } else {
            // Reset if opening as new
            if (open) {
                setFormData({
                    symbol: '',
                    direction: 'LONG',
                    entry_price: '',
                    exit_price: '',
                    size: '',
                    stop_loss: ''
                })
            }
        }
        if (open) {
            setShowDeleteConfirm(false)
            setIsDeleting(false)
        }
    }, [initialData, open]) // Reset when opening/changing data

    const [loading, setLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Finnhub States
    const [searchResults, setSearchResults] = useState<FinnhubSymbol[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)

    // Symbol Search Effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (formData.symbol && formData.symbol.length >= 2 && showResults) {
                setIsSearching(true)
                const results = await searchSymbols(formData.symbol)
                setSearchResults(results)
                setIsSearching(false)
            } else {
                setSearchResults([])
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [formData.symbol, showResults])

    // Close results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelectSymbol = async (s: FinnhubSymbol) => {
        setFormData(prev => ({ ...prev, symbol: s.symbol }))
        setShowResults(false)
        fetchPrice(s.symbol)
    }

    const fetchPrice = async (symbol: string) => {
        if (!symbol) return
        setIsSearching(true)
        const quote = await getQuote(symbol)
        if (quote && quote.c) {
            setFormData(prev => ({
                ...prev,
                entry_price: quote.c.toString(),
                exit_price: prev.exit_price ? prev.exit_price : quote.c.toString(),
                stop_loss: prev.stop_loss ? prev.stop_loss : quote.c.toString()
            }))
        }
        setIsSearching(false)
    }

    // Auto-fetch price when symbol is changed manually (debounced)
    useEffect(() => {
        if (!formData.symbol || formData.symbol.length < 2) return

        const timer = setTimeout(() => {
            // Only fetch if not already show results (meaning user might have finished typing)
            // or if it's a direct manual change
            if (!showResults) {
                fetchPrice(formData.symbol)
            }
        }, 1000)

        return () => clearTimeout(timer)
    }, [formData.symbol, showResults])

    // Dynamic step calculation based on decimal precision
    const getStep = (value: string) => {
        if (!value || !value.includes('.')) return '1';
        const decimals = value.split('.')[1].length;
        return (1 / Math.pow(10, decimals)).toFixed(decimals);
    }

    // Calculate PnL Preview
    const entry = Number(formData.entry_price)
    const exit = Number(formData.exit_price)
    const size = Number(formData.size)

    let pnlPreview = null
    if (entry && exit && size) {
        pnlPreview = formData.direction === 'LONG'
            ? (exit - entry) * size
            : (entry - exit) * size
    }

    const supabase = createClient()
    const router = useRouter()

    const handleSubmit = async () => {
        if (!formData.symbol || !formData.entry_price || !formData.size || !formData.stop_loss) {
            setError("All fields required (except exit price)")
            return
        }
        setLoading(true)
        setError(null)

        const entry = Number(formData.entry_price)
        const stop = Number(formData.stop_loss)
        const sizeVal = Number(formData.size)

        // Validate Stop Loss Logic
        if (formData.direction === 'LONG' && stop >= entry) {
            setError("For LONG trades, Stop Loss must be below Entry Price.")
            setLoading(false)
            return
        }
        if (formData.direction === 'SHORT' && stop <= entry) {
            setError("For SHORT trades, Stop Loss must be above Entry Price.")
            setLoading(false)
            return
        }

        // Calculate Risk Amount automatically
        const calculatedRisk = Math.abs(entry - stop) * sizeVal

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const isClosed = !!formData.exit_price

        const tradePayload = {
            symbol: formData.symbol.toUpperCase(),
            direction: formData.direction,
            entry_price: entry,
            exit_price: isClosed ? Number(formData.exit_price) : null,
            pnl: isClosed ? pnlPreview : null,
            size: sizeVal,
            risk_amount: calculatedRisk, // Backend still expects dollar risk
            status: isClosed ? 'CLOSED' : 'OPEN',
        }

        let resultError = null

        if (initialData?.id) {
            // UPDATE
            const { error } = await supabase
                .from('trades')
                .update(tradePayload)
                .eq('id', initialData.id)
                .eq('user_id', user.id)
            resultError = error
        } else {
            // INSERT
            const { error } = await supabase
                .from('trades')
                .insert({
                    ...tradePayload,
                    user_id: user.id,
                    executed_at: new Date().toISOString()
                })
            resultError = error
        }

        if (resultError) {
            setError(resultError.message)
        } else {
            onSuccess()
            onOpenChange(false)
            router.refresh()
        }
        setLoading(false)
    }

    const handleDelete = async () => {
        if (!initialData?.id || !showDeleteConfirm) {
            setShowDeleteConfirm(true)
            return
        }

        setLoading(true)
        setIsDeleting(true)
        setError(null)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase
            .from('trades')
            .delete()
            .eq('id', initialData.id)
            .eq('user_id', user.id)

        if (error) {
            setError(error.message)
            setIsDeleting(false)
            setLoading(false)
        } else {
            onSuccess()
            onOpenChange(false)
            router.refresh()
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border/50 sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Trade' : 'Log Trade'}</DialogTitle>
                    <p className="text-xs text-muted-foreground">Fill "Exit Price" to log a completed trade.</p>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2 relative" ref={searchRef}>
                            <Label>
                                Symbol
                                <FieldHint content="The ticker symbol of the asset (e.g., BTCUSD, TSLA)." />
                            </Label>
                            <div className="relative">
                                <Input
                                    placeholder="Search Symbol..."
                                    value={formData.symbol || ''}
                                    onChange={e => {
                                        setFormData({ ...formData, symbol: e.target.value })
                                        setShowResults(true)
                                    }}
                                    onFocus={() => setShowResults(true)}
                                    className="pr-8"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                </div>
                            </div>

                            {showResults && (searchResults.length > 0 || isSearching) && (
                                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                                    {isSearching && searchResults.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-muted-foreground">Searching...</div>
                                    ) : (
                                        searchResults.map((s) => (
                                            <div
                                                key={s.symbol}
                                                className="p-2 hover:bg-accent cursor-pointer border-b border-border/50 last:border-0"
                                                onClick={() => handleSelectSymbol(s)}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-sm">{s.symbol}</span>
                                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{s.type}</span>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground truncate">{s.description}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>
                                Direction
                                <FieldHint content="Long (Buy) or Short (Sell)." />
                            </Label>
                            <Select value={formData.direction || 'LONG'} onValueChange={v => setFormData({ ...formData, direction: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LONG">LONG</SelectItem>
                                    <SelectItem value="SHORT">SHORT</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>
                                Entry Price
                                <FieldHint content="The price at which you opened the position." />
                            </Label>
                            <Input
                                type="number"
                                step={getStep(formData.entry_price)}
                                placeholder="0.00"
                                value={formData.entry_price || ''}
                                onChange={e => setFormData({ ...formData, entry_price: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">
                                Exit Price (Optional)
                                <FieldHint content="Fill this only if the trade is closed. The price at which you exited." />
                            </Label>
                            <Input
                                type="number"
                                step={getStep(formData.exit_price)}
                                placeholder="0.00"
                                className="border-dashed border-muted-foreground/50"
                                value={formData.exit_price || ''}
                                onChange={e => setFormData({ ...formData, exit_price: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>
                                Size
                                <FieldHint content="Position size in units/contracts (e.g., 0.1 BTC)." />
                            </Label>
                            <Input
                                type="number"
                                step="any"
                                placeholder="1.0"
                                value={formData.size || ''}
                                onChange={e => setFormData({ ...formData, size: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>
                                Stop Loss ($)
                                <FieldHint content="Price level where trade is invalidated." />
                            </Label>
                            <Input
                                type="number"
                                step={getStep(formData.stop_loss)}
                                placeholder="0.00"
                                value={formData.stop_loss || ''}
                                onChange={e => setFormData({ ...formData, stop_loss: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* PnL Preview */}
                    {pnlPreview !== null && (
                        <div className={cn(
                            "p-3 rounded-lg flex justify-between items-center text-sm font-medium",
                            pnlPreview >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        )}>
                            <span>Estimated PnL:</span>
                            <span>{pnlPreview >= 0 ? "+" : ""}${pnlPreview.toFixed(2)}</span>
                        </div>
                    )}
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <DialogFooter className="flex-row gap-2 sm:gap-0">
                    {initialData && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDelete}
                            disabled={loading}
                            className={cn(
                                "shrink-0 transition-all duration-200",
                                showDeleteConfirm ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 w-auto px-4 gap-2" : "text-muted-foreground hover:text-red-500"
                            )}
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            {showDeleteConfirm && !isDeleting && <span className="text-xs font-semibold uppercase tracking-wider">Confirm Delete</span>}
                        </Button>
                    )}
                    <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-primary hover:bg-primary/90">
                        {loading && !isDeleting && <Loader2 className="animate-spin mr-2 w-4 h-4" />}
                        {initialData ? 'Save Changes' : (formData.exit_price ? 'Log Completed Trade' : 'Log New Position')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
