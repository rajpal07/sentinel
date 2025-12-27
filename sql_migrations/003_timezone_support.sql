-- 1. Add Timezone Column to Rules
ALTER TABLE rules ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- 2. Helper to get active daily lock for a user based on THEIR timezone
CREATE OR REPLACE FUNCTION public.get_my_active_lock(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    lock_date DATE,
    reason TEXT,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_tz TEXT;
    v_today DATE;
BEGIN
    SELECT timezone INTO v_tz FROM rules WHERE rules.user_id = p_user_id;
    v_tz := COALESCE(v_tz, 'UTC');
    v_today := (NOW() AT TIME ZONE v_tz)::DATE;

    RETURN QUERY SELECT * FROM daily_locks 
    WHERE daily_locks.user_id = p_user_id 
    AND daily_locks.lock_date = v_today;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update submit_trade to use Server-Side Timezone Logic
-- (Replacing the 10-argument version used by Client)
CREATE OR REPLACE FUNCTION public.submit_trade(
    p_symbol TEXT,
    p_size NUMERIC,
    p_entry_price NUMERIC,
    p_exit_price NUMERIC,
    p_pnl NUMERIC,
    p_status TEXT,
    p_strategy TEXT DEFAULT NULL,
    p_timeframe TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_client_time TIME DEFAULT NULL -- Kept for signature compatibility, but IGNORED
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_tz TEXT;
    v_today DATE;
    v_now_time TIME;
    v_rule_record RECORD;
    v_daily_pnl NUMERIC;
    v_trades_count INTEGER;
    v_trade_id UUID;
BEGIN
    -- Fetch Rules & Timezone
    SELECT * INTO v_rule_record FROM rules WHERE user_id = v_user_id;
    IF v_rule_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No trading rules found');
    END IF;
    
    v_tz := COALESCE(v_rule_record.timezone, 'UTC');
    
    -- Calculate User's Local Time (Server Side Authority)
    v_today := (NOW() AT TIME ZONE v_tz)::DATE;
    v_now_time := (NOW() AT TIME ZONE v_tz)::TIME;

    -- 1. TRADING WINDOW CHECK
    IF v_rule_record.trading_window_start IS NOT NULL AND v_rule_record.trading_window_end IS NOT NULL THEN
       -- Handle Overnight Windows (Start > End)
       IF v_rule_record.trading_window_start <= v_rule_record.trading_window_end THEN
          -- Standard
          IF v_now_time < v_rule_record.trading_window_start OR v_now_time > v_rule_record.trading_window_end THEN
             RETURN jsonb_build_object('success', false, 'error', 'Trading window closed (Server Time: ' || v_now_time || ')');
          END IF;
       ELSE
          -- Overnight
          IF v_now_time < v_rule_record.trading_window_start AND v_now_time > v_rule_record.trading_window_end THEN
             RETURN jsonb_build_object('success', false, 'error', 'Trading window closed (Server Time: ' || v_now_time || ')');
          END IF;
       END IF;
    END IF;

    -- 2. DAILY LOCK CHECK (For User's Today)
    IF EXISTS (SELECT 1 FROM daily_locks WHERE user_id = v_user_id AND lock_date = v_today) THEN
         RETURN jsonb_build_object('success', false, 'error', 'Account is locked for today (' || v_today || ')');
    END IF;

    -- 3. INSERT TRADE
    INSERT INTO trades (user_id, symbol, size, entry_price, exit_price, pnl, status, strategy, timeframe, notes, executed_at)
    VALUES (v_user_id, p_symbol, p_size, p_entry_price, p_exit_price, p_pnl, p_status, p_strategy, p_timeframe, p_notes, NOW())
    RETURNING id INTO v_trade_id;

    -- 4. MAX LOSS CHECK (Aggregated by User's Day)
    IF v_rule_record.max_daily_loss IS NOT NULL THEN
        SELECT COALESCE(SUM(pnl), 0) INTO v_daily_pnl
        FROM trades
        WHERE user_id = v_user_id
        -- CAUTION: We must filter by the USER's day, considering timezone
        AND (executed_at AT TIME ZONE v_tz)::DATE = v_today; 

        IF v_daily_pnl <= -(ABS(v_rule_record.max_daily_loss)) THEN
            INSERT INTO daily_locks (user_id, lock_date, reason)
            VALUES (v_user_id, v_today, 'MAX_LOSS_HIT')
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- 5. FREQUENCY CHECK (Aggregated by User's Day)
    IF v_rule_record.max_trades_per_day IS NOT NULL THEN
         SELECT COUNT(*) INTO v_trades_count
         FROM trades
         WHERE user_id = v_user_id
         AND (executed_at AT TIME ZONE v_tz)::DATE = v_today;
         
         IF v_trades_count > v_rule_record.max_trades_per_day THEN
            INSERT INTO daily_locks (user_id, lock_date, reason)
            VALUES (v_user_id, v_today, 'MAX_TRADES_EXCEEDED')
            ON CONFLICT DO NOTHING;
         END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'trade_id', v_trade_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
