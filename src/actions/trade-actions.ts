'use server'

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function submitTradeAction(formData: any) {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        return { success: false, error: "Unauthorized" }
    }

    const { user } = session;

    try {
        // console.log('Submitting trade for user:', user.id);

        // Call the PostgreSQL function directly
        // submit_trade(p_user_id, p_symbol, ...)

        const query = `
            SELECT submit_trade(
                $1::text, 
                $2::text, 
                $3::text, 
                $4::numeric, 
                $5::numeric, 
                $6::numeric, 
                $7::numeric, 
                $8::numeric, 
                $9::numeric, 
                $10::text, 
                $11::time
            ) as result
        `;

        const values = [
            user.id,
            formData.p_symbol,
            formData.p_direction,
            formData.p_size,
            formData.p_entry_price,
            formData.p_stop_loss,
            formData.p_risk_amount,
            formData.p_exit_price,
            formData.p_pnl,
            formData.p_status,
            formData.p_client_time
        ];

        const res = await pool.query(query, values);
        const result = res.rows[0].result; // JSONB result directly from function

        if (result.status === 'SUCCESS') {
            revalidatePath('/dashboard');
            return { success: true, message: result.message };
        } else {
            return { success: false, error: result.message };
        }
    } catch (err: any) {
        console.error('Trade Submission Error:', err);
        return { success: false, error: err.message };
    }
}

export async function deleteTradeAction(tradeId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        await pool.query('DELETE FROM trades WHERE id = $1 AND user_id = $2', [tradeId, session.user.id]);
        revalidatePath('/dashboard');
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
