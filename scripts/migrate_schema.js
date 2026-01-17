require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const connectionString = 'postgresql://postgres.udrbmgnlhjnhdtssxydm:NClUyt5k7dn9OLzy@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

const executeQuery = async (client, query, description) => {
    try {
        console.log(`Executing: ${description}`);
        await client.query(query);
        console.log(`✅ Success: ${description}`);
    } catch (err) {
        console.error(`❌ Failed: ${description}`, err.message);
        // Continue despite errors to ensure we try everything
    }
};

async function migrateSchema() {
    const client = await pool.connect();
    try {
        console.log('Starting Robust Schema Migration for Better Auth...');

        const tables = ['trades', 'rules', 'daily_locks', 'profiles'];

        // 0. Ensure 'violations' table exists (it was missing but needed)
        // Based on usage in submit_trade: 
        // INSERT INTO violations (user_id, reason, details) ...
        const createViolationsQuery = `
      CREATE TABLE IF NOT EXISTS violations (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL, -- Created directly as TEXT to match goal
          reason TEXT NOT NULL,
          details JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
        await executeQuery(client, createViolationsQuery, 'Create violations table if not exists');

        // 1. Drop ALL Policies on tables
        // We use a dynamic query to find and drop all policies for our target tables
        for (const table of tables) {
            // Disable RLS
            await executeQuery(client, `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`, `Disable RLS on ${table}`);

            // Find policies
            const res = await client.query(`
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = $1 AND schemaname = 'public'
        `, [table]);

            for (const row of res.rows) {
                const policyName = row.policyname;
                await executeQuery(client, `DROP POLICY IF EXISTS "${policyName}" ON ${table}`, `Drop policy "${policyName}" on ${table}`);
            }
        }

        // 2. Drop Foreign Key Constraints
        // We check for commonly named FKs but also might need to find them dynamically if names vary.
        // For now, let's try the ones we know + generic "Drop if exists" for likely names.
        await executeQuery(client, `ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_user_id_fkey`, 'Drop FK trades -> auth.users');
        await executeQuery(client, `ALTER TABLE rules DROP CONSTRAINT IF EXISTS rules_user_id_fkey`, 'Drop FK rules -> auth.users');
        await executeQuery(client, `ALTER TABLE daily_locks DROP CONSTRAINT IF EXISTS daily_locks_user_id_fkey`, 'Drop FK daily_locks -> auth.users');
        await executeQuery(client, `ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey`, 'Drop FK profiles -> auth.users');

        // 3. Alter Columns to TEXT
        // Now that policies and FKs are gone, this should succeed.
        await executeQuery(client, `ALTER TABLE trades ALTER COLUMN user_id TYPE TEXT`, 'Convert trades.user_id to TEXT');
        await executeQuery(client, `ALTER TABLE rules ALTER COLUMN user_id TYPE TEXT`, 'Convert rules.user_id to TEXT');
        await executeQuery(client, `ALTER TABLE daily_locks ALTER COLUMN user_id TYPE TEXT`, 'Convert daily_locks.user_id to TEXT');

        // Profiles table 'id'
        await executeQuery(client, `ALTER TABLE profiles ALTER COLUMN id TYPE TEXT`, 'Convert profiles.id to TEXT');

        // 4. Update submit_trade Logic (Same as before, but ensuring it works)
        console.log('Updating submit_trade function...');
        const updateSubmitTradeQuery = `
CREATE OR REPLACE FUNCTION submit_trade(
    p_user_id TEXT,
    p_symbol TEXT,
    p_direction TEXT,
    p_size NUMERIC,
    p_entry_price NUMERIC,
    p_stop_loss NUMERIC,
    p_risk_amount NUMERIC,
    p_exit_price NUMERIC,
    p_pnl NUMERIC,
    p_status TEXT,
    p_client_time TIME DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id TEXT;
    v_is_locked BOOLEAN;
    v_rule_record RECORD;
    v_rules JSONB;
    v_max_loss NUMERIC;
    v_max_trades INTEGER;
    v_current_pnl NUMERIC;
    v_trade_count INTEGER;
    v_start_time TIME;
    v_end_time TIME;
    v_now_time TIME;
BEGIN
    v_user_id := p_user_id;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('status', 'ERROR', 'message', 'Unauthorized: No User ID provided');
    END IF;

    -- Check locks
    SELECT EXISTS(SELECT 1 FROM daily_locks WHERE user_id = v_user_id AND lock_date = CURRENT_DATE) INTO v_is_locked;
    IF v_is_locked THEN
        INSERT INTO violations (user_id, reason, details) VALUES (v_user_id, 'LOCKED_SESSION_ATTEMPT', jsonb_build_object('symbol', p_symbol));
        RETURN jsonb_build_object('status', 'BLOCKED', 'message', 'Session is strictly locked.');
    END IF;

    -- Fetch Rules explicit
    SELECT * FROM rules WHERE user_id = v_user_id LIMIT 1 INTO v_rule_record;
    
    IF v_rule_record IS NULL THEN
         v_rules := '{}'::jsonb;
    ELSE
         v_rules := to_jsonb(v_rule_record);
    END IF;

    -- Extract values with explicit casts
    v_max_loss := COALESCE((v_rules->>'max_daily_loss')::numeric, 500);
    v_max_trades := COALESCE((v_rules->>'max_trades_per_day')::numeric, 5);

    -- ... stats ...
    SELECT COALESCE(SUM(pnl), 0), COUNT(*) 
    INTO v_current_pnl, v_trade_count
    FROM trades 
    WHERE user_id = v_user_id AND executed_at >= CURRENT_DATE;

    -- Trade Limit
    IF v_trade_count >= v_max_trades THEN
        INSERT INTO violations (user_id, reason, details) 
        VALUES (v_user_id, 'MAX_TRADES_EXCEEDED', jsonb_build_object('limit', v_max_trades, 'current', v_trade_count));
        
        INSERT INTO daily_locks (user_id, reason) VALUES (v_user_id, 'MAX_TRADES_EXCEEDED') ON CONFLICT DO NOTHING;
        RETURN jsonb_build_object('status', 'BLOCKED', 'message', 'Daily trade limit exceeded.');
    END IF;

    -- Time Window
    IF (v_rules->>'trading_window_start') IS NOT NULL AND (v_rules->>'trading_window_end') IS NOT NULL THEN
        v_start_time := (v_rules->>'trading_window_start')::time;
        v_end_time := (v_rules->>'trading_window_end')::time;
        
        -- USE CLIENT TIME IF PROVIDED, ELSE SERVER TIME (UTC)
        IF p_client_time IS NOT NULL THEN
            v_now_time := p_client_time;
        ELSE
            v_now_time := CURRENT_TIME;
        END IF;
        
        -- Overnight Logic
        IF v_end_time < v_start_time THEN
            IF v_now_time > v_end_time AND v_now_time < v_start_time THEN
                 INSERT INTO violations (user_id, reason, details) 
                 VALUES (v_user_id, 'TIME_WINDOW_VIOLATION', jsonb_build_object('window', (v_rules->>'trading_window_start') || '-' || (v_rules->>'trading_window_end')));
                 RETURN jsonb_build_object('status', 'BLOCKED', 'message', 'Trading window closed.');
            END IF;
        ELSE
            IF v_now_time < v_start_time OR v_now_time > v_end_time THEN
                 INSERT INTO violations (user_id, reason, details) 
                 VALUES (v_user_id, 'TIME_WINDOW_VIOLATION', jsonb_build_object('window', (v_rules->>'trading_window_start') || '-' || (v_rules->>'trading_window_end')));
                 RETURN jsonb_build_object('status', 'BLOCKED', 'message', 'Trading window closed.');
            END IF;
        END IF;
    END IF;

    -- Insert Trade
    INSERT INTO trades (
        user_id, symbol, direction, size, entry_price, 
        stop_loss, exit_price, pnl, status, risk_amount, executed_at
    ) VALUES (
        v_user_id, p_symbol, p_direction, p_size, p_entry_price, 
        p_stop_loss, p_exit_price, p_pnl, p_status, p_risk_amount, NOW()
    );

    -- Max Loss Check
    IF p_status = 'CLOSED' AND p_pnl < 0 THEN
         v_current_pnl := v_current_pnl + p_pnl;
         IF v_current_pnl <= (-1 * ABS(v_max_loss)) THEN
            INSERT INTO violations (user_id, reason, details) 
            VALUES (v_user_id, 'MAX_LOSS_HIT', jsonb_build_object('limit', v_max_loss, 'current', v_current_pnl));
            
            INSERT INTO daily_locks (user_id, reason) VALUES (v_user_id, 'MAX_LOSS_HIT') ON CONFLICT DO NOTHING;
            
             RETURN jsonb_build_object('status', 'SUCCESS', 'message', 'Trade logged. DAILY LOSS LIMIT HIT. Account Locked.');
         END IF;
    END IF;

    RETURN jsonb_build_object('status', 'SUCCESS', 'message', 'Trade logged successfully.');
END;
$$;
    `;
        await executeQuery(client, updateSubmitTradeQuery, 'Update submit_trade function');

        console.log('Migration Complete.');
    } finally {
        client.release();
        process.exit(0);
    }
}

migrateSchema();
