import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { pool } from "@/lib/db";
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RecentTradesList } from '@/components/dashboard/recent-trades-list'
import { ViolationsList } from '@/components/dashboard/violations-list'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        redirect('/login')
    }

    const { user } = session;

    const tradesRes = await pool.query(`
        SELECT * FROM trades 
        WHERE user_id = $1 
        ORDER BY executed_at DESC
    `, [user.id]);
    const trades = tradesRes.rows;

    const violationsRes = await pool.query(`
        SELECT * FROM violations 
        WHERE user_id = $1 
        ORDER BY created_at DESC
    `, [user.id]);
    const violations = violationsRes.rows;

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
                            <ViolationsList violations={violations || []} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
