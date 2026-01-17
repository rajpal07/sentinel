'use server'

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateRulesAction(rules: any) {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        return { success: false, error: "Unauthorized" }
    }

    const { user } = session;

    try {
        const query = `
            INSERT INTO rules (
                max_risk_per_trade_percent,
                max_daily_loss,
                max_trades_per_day,
                trading_window_start,
                trading_window_end,
                timezone,
                setup_complete,
                user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (user_id) DO UPDATE SET
                max_risk_per_trade_percent = EXCLUDED.max_risk_per_trade_percent,
                max_daily_loss = EXCLUDED.max_daily_loss,
                max_trades_per_day = EXCLUDED.max_trades_per_day,
                trading_window_start = EXCLUDED.trading_window_start,
                trading_window_end = EXCLUDED.trading_window_end,
                timezone = EXCLUDED.timezone,
                setup_complete = EXCLUDED.setup_complete
        `;

        const values = [
            isNaN(Number(rules.max_risk_per_trade_percent)) ? 1 : Number(rules.max_risk_per_trade_percent),
            isNaN(Number(rules.max_daily_loss)) ? 100 : Number(rules.max_daily_loss),
            isNaN(Number(rules.max_trades_per_day)) ? 5 : Number(rules.max_trades_per_day),
            rules.trading_window_start,
            rules.trading_window_end,
            rules.timezone || 'UTC',
            rules.setup_complete ?? true,
            user.id
        ];

        await pool.query(query, values);
        revalidatePath('/dashboard');
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function getUserRulesAction() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const res = await pool.query('SELECT * FROM rules WHERE user_id = $1', [session.user.id]);
        return { success: true, data: res.rows[0] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}


export async function lockSessionAction(reason: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        // Use RPC or Direct Insert
        // RPC: lock_session(p_reason) relies on auth.uid() usually.
        // Let's check if we can call the function passing user_id if we modified it?
        // OR just insert into daily_locks.
        // The original RPC `lock_session` logic:
        // INSERT INTO daily_locks (user_id, lock_date, reason) VALUES (auth.uid(), CURRENT_DATE, p_reason) ON CONFLICT DO NOTHING;

        const query = `
            INSERT INTO daily_locks (user_id, lock_date, reason) 
            VALUES ($1, CURRENT_DATE, $2) 
            ON CONFLICT (user_id, lock_date) DO NOTHING
        `;

        await pool.query(query, [session.user.id, reason]);
        revalidatePath('/dashboard');
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
