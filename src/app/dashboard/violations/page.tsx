import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ViolationsClient } from './violations-client'

export const dynamic = 'force-dynamic'

export default async function ViolationPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch Rules
    const { data: rules } = await supabase.from('rules').select('*').eq('user_id', user.id).single()

    // Fetch Buffer of Trades (Last 48h to be safe for any timezone)
    const twoDaysAgo = new Date()
    twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2)

    const { data: tradesBuffer } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('executed_at', twoDaysAgo.toISOString())

    // Fetch Recent Locks (Last 2 days)
    // We fetch a buffer because User's "Today" might be "Yesterday" or "Tomorrow" relative to UTC
    const { data: recentLocks } = await supabase
        .from('daily_locks')
        .select('*')
        .eq('user_id', user.id)
        .gte('lock_date', twoDaysAgo.toISOString().split('T')[0])

    return <ViolationsClient rules={rules} tradesBuffer={tradesBuffer || []} recentLocks={recentLocks || []} />
}
