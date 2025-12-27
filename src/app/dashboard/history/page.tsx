import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RecentTradesList } from '@/components/dashboard/recent-trades-list'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('executed_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Ledger</h1>
                <p className="text-muted-foreground">Audit your trading history.</p>
            </div>

            <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Trade History</CardTitle>
                    <CardDescription>
                        All executed trades and their outcomes. Click on a trade to edit details.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RecentTradesList trades={trades || []} />
                </CardContent>
            </Card>
        </div>
    )
}
