import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield } from 'lucide-react'
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
                <p className="text-muted-foreground">Audit your trading history and system interventions.</p>
            </div>

            <Tabs defaultValue="trades" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="trades">Trades</TabsTrigger>
                    <TabsTrigger value="violations">Violations</TabsTrigger>
                </TabsList>

                <TabsContent value="trades">
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
                </TabsContent>

                <TabsContent value="violations">
                    <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>System Interactions</CardTitle>
                            <CardDescription>
                                Log of rule violations and system lockouts.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Placeholder for violations integration */}
                            <div className="text-center py-12 text-muted-foreground">
                                <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                No violations recorded. Good discipline.
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

