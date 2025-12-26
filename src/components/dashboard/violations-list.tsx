'use client'

import { format } from 'date-fns'

interface Violation {
    id: string
    created_at: string
    rule_type: string
    details: any
    reason: string | null
}

export function ViolationsList({ violations }: { violations: Violation[] }) {
    if (violations.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <span className="text-4xl block mb-4">🛡️</span>
                No violations recorded. Good discipline.
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {violations.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                    <div>
                        <div className="font-semibold text-red-500 flex items-center gap-2">
                            {v.rule_type === 'EMOTIONAL_GATE' ? 'Emotional Gate Failure' :
                                v.reason || v.rule_type}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                            {JSON.stringify(v.details || v.reason || 'No details')}
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                        {format(new Date(v.created_at), 'dd MMM HH:mm')}
                    </div>
                </div>
            ))}
        </div>
    )
}
