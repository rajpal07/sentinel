-- Update submit_trade to include Advisory Locks and Optimized Query Patterns
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
    p_client_time TIME DEFAULT NULL
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
    v_start_utc TIMESTAMPTZ;
    v_end_utc TIMESTAMPTZ;
BEGIN
    -- 0. PREVENT RACE CONDITIONS
    -- Acquire an exclusive transaction-level advisory lock for this user.
    -- This serializes strict checks (Max Loss) for rapid-fire requests.
    PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

    -- Fetch Rules & Timezone
    SELECT * INTO v_rule_record FROM rules WHERE user_id = v_user_id;
    IF v_rule_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No trading rules found');
    END IF;
    
    v_tz := COALESCE(v_rule_record.timezone, 'UTC');
    
    -- Calculate User's Local Time
    v_today := (NOW() AT TIME ZONE v_tz)::DATE;
    v_now_time := (NOW() AT TIME ZONE v_tz)::TIME;

    -- Calculate UTC Range for Index-Friendly Queries
    -- Treat v_today as midnight in v_tz, then convert to UTC
    v_start_utc := v_today::TIMESTAMP AT TIME ZONE v_tz;
    v_end_utc := v_start_utc + interval '1 day';

    -- 1. TRADING WINDOW CHECK
    IF v_rule_record.trading_window_start IS NOT NULL AND v_rule_record.trading_window_end IS NOT NULL THEN
       IF v_rule_record.trading_window_start <= v_rule_record.trading_window_end THEN
          -- Standard
          IF v_now_time < v_rule_record.trading_window_start OR v_now_time > v_rule_record.trading_window_end THEN
             RETURN jsonb_build_object('success', false, 'error', 'Trading window closed (' || v_now_time || ')');
          END IF;
       ELSE
          -- Overnight
          IF v_now_time < v_rule_record.trading_window_start AND v_now_time > v_rule_record.trading_window_end THEN
             RETURN jsonb_build_object('success', false, 'error', 'Trading window closed (' || v_now_time || ')');
          END IF;
       END IF;
    END IF;

    -- 2. DAILY LOCK CHECK
    IF EXISTS (SELECT 1 FROM daily_locks WHERE user_id = v_user_id AND lock_date = v_today) THEN
         RETURN jsonb_build_object('success', false, 'error', 'Account is locked for today (' || v_today || ')');
    END IF;

    -- 3. INSERT TRADE
    INSERT INTO trades (user_id, symbol, size, entry_price, exit_price, pnl, status, strategy, timeframe, notes, executed_at)
    VALUES (v_user_id, p_symbol, p_size, p_entry_price, p_exit_price, p_pnl, p_status, p_strategy, p_timeframe, p_notes, NOW())
    RETURNING id INTO v_trade_id;

    -- 4. MAX LOSS CHECK (Optimized Range Query)
    IF v_rule_record.max_daily_loss IS NOT NULL THEN
        SELECT COALESCE(SUM(pnl), 0) INTO v_daily_pnl
        FROM trades
        WHERE user_id = v_user_id
        AND executed_at >= v_start_utc 
        AND executed_at < v_end_utc;

        IF v_daily_pnl <= -(ABS(v_rule_record.max_daily_loss)) THEN
            INSERT INTO daily_locks (user_id, lock_date, reason)
            VALUES (v_user_id, v_today, 'MAX_LOSS_HIT')
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- 5. FREQUENCY CHECK (Optimized Range Query)
    IF v_rule_record.max_trades_per_day IS NOT NULL THEN
         SELECT COUNT(*) INTO v_trades_count
         FROM trades
         WHERE user_id = v_user_id
         AND executed_at >= v_start_utc 
         AND executed_at < v_end_utc;
         
         IF v_trades_count > v_rule_record.max_trades_per_day THEN
            INSERT INTO daily_locks (user_id, lock_date, reason)
            VALUES (v_user_id, v_today, 'MAX_TRADES_EXCEEDED')
            ON CONFLICT DO NOTHING;
         END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'trade_id', v_trade_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
