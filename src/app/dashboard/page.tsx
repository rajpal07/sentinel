import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getRecentTradesStartDate } from '@/lib/date-utils'
import { DashboardClient } from '@/components/dashboard/dashboard-client'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check Setup
    const { data: rules } = await supabase.from('rules').select('*').eq('user_id', user.id).single()
    if (rules && !rules.setup_complete) {
        redirect('/start')
    }

    // Fetch Data
    // We fetch a buffer of trades (e.g. last 48 hours) so the client can filter
    // for "Today" based on their local time.
    const recentTradesStartDate = getRecentTradesStartDate()

    const { data: initialTrades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('executed_at', recentTradesStartDate)
        .order('executed_at', { ascending: false })

    // Fetch Lock Status (Timezone Aware via RPC)
    const { data: dailyLock } = await supabase
        .rpc('get_my_active_lock', { p_user_id: user.id })
        .maybeSingle()

    const isServerLocked = !!dailyLock
    const serverLockReason = (dailyLock as { reason?: string })?.reason || null

    return <DashboardClient initialTrades={initialTrades || []} rules={rules} isServerLocked={isServerLocked} serverLockReason={serverLockReason} />
}

