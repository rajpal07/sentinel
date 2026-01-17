import { redirect } from 'next/navigation'
import { getRecentTradesStartDate } from '@/lib/date-utils'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { pool } from "@/lib/db";

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        redirect('/login')
    }

    const { user } = session;

    // Check Setup
    // rules table
    const rulesRes = await pool.query('SELECT * FROM rules WHERE user_id = $1 LIMIT 1', [user.id]);
    const rules = rulesRes.rows[0];

    if (rules && !rules.setup_complete) {
        redirect('/start')
    }

    // Fetch Data
    // We fetch a buffer of trades (e.g. last 48 hours)
    const recentTradesStartDate = getRecentTradesStartDate()

    const tradesRes = await pool.query(`
        SELECT * FROM trades 
        WHERE user_id = $1 
        AND executed_at >= $2
        ORDER BY executed_at DESC
    `, [user.id, recentTradesStartDate]);

    const initialTrades = tradesRes.rows;

    // Fetch Lock Status (Timezone Aware via RPC or direct query)
    // Direct Query:
    // SELECT * FROM daily_locks WHERE user_id = $1 AND lock_date = CURRENT_DATE
    const lockRes = await pool.query(`
        SELECT * FROM daily_locks 
        WHERE user_id = $1 
        AND lock_date = CURRENT_DATE 
        LIMIT 1
    `, [user.id]);

    const dailyLock = lockRes.rows[0];

    const isServerLocked = !!dailyLock
    const serverLockReason = dailyLock?.reason || null

    return <DashboardClient initialTrades={initialTrades || []} rules={rules} isServerLocked={isServerLocked} serverLockReason={serverLockReason} />
}
