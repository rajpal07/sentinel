-- Applied on 2025-12-28
-- Fixes: "text ->> unknown" error and Overnight Trading Window logic

CREATE OR REPLACE FUNCTION submit_trade(
    p_symbol TEXT,
    p_direction TEXT,
    p_size NUMERIC,
    p_entry_price NUMERIC,
    p_stop_loss NUMERIC,
    p_risk_amount NUMERIC,
    p_exit_price NUMERIC,
    p_pnl NUMERIC,
    p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_is_locked BOOLEAN;
    v_rules JSONB;
    v_max_loss NUMERIC;
    v_max_trades INTEGER;
    v_current_pnl NUMERIC;
    v_trade_count INTEGER;
    v_start_time TIME;
    v_end_time TIME;
    v_now_time TIME;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('status', 'ERROR', 'message', 'Unauthorized');
    END IF;

    -- Check for existing daily lock
    SELECT EXISTS(SELECT 1 FROM daily_locks WHERE user_id = v_user_id AND lock_date = CURRENT_DATE) INTO v_is_locked;
    IF v_is_locked THEN
        INSERT INTO violations (user_id, reason, details) VALUES (v_user_id, 'LOCKED_SESSION_ATTEMPT', jsonb_build_object('symbol', p_symbol));
        RETURN jsonb_build_object('status', 'BLOCKED', 'message', 'Session is strictly locked.');
    END IF;

    -- Fetch Rules
    SELECT to_jsonb(r) FROM rules r WHERE r.user_id = v_user_id INTO v_rules;
    
    -- Parse Rules safely
    v_max_loss := COALESCE((v_rules->>'max_daily_loss')::numeric, 500);
    v_max_trades := COALESCE((v_rules->>'max_trades_per_day')::numeric, 5);
    
    -- Check Trade Frequency
    SELECT 
        COALESCE(SUM(pnl), 0), 
        COUNT(*) 
    INTO v_current_pnl, v_trade_count
    FROM trades 
    WHERE user_id = v_user_id 
    AND executed_at >= CURRENT_DATE;

    IF v_trade_count >= v_max_trades THEN
        INSERT INTO violations (user_id, reason, details) VALUES (v_user_id, 'MAX_TRADES_EXCEEDED', jsonb_build_object('limit', v_max_trades, 'current', v_trade_count));
        INSERT INTO daily_locks (user_id, reason) VALUES (v_user_id, 'MAX_TRADES_EXCEEDED') ON CONFLICT DO NOTHING;
        RETURN jsonb_build_object('status', 'BLOCKED', 'message', 'Daily trade limit exceeded.');
    END IF;

    -- Check Time Window (With Overnight Support)
    IF (v_rules->>'trading_window_start') IS NOT NULL AND (v_rules->>'trading_window_end') IS NOT NULL THEN
        v_start_time := (v_rules->>'trading_window_start')::time;
        v_end_time := (v_rules->>'trading_window_end')::time;
        v_now_time := CURRENT_TIME;
        
        IF v_end_time < v_start_time THEN
            -- Overnight Window (e.g. 22:00 to 06:00)
            -- Block if time is IN THE GAP (After end AND Before Start)
            IF v_now_time > v_end_time AND v_now_time < v_start_time THEN
                 INSERT INTO violations (user_id, reason, details) VALUES (v_user_id, 'TIME_WINDOW_VIOLATION', jsonb_build_object('window', v_rules->>'trading_window_start' || '-' || v_rules->>'trading_window_end'));
                 RETURN jsonb_build_object('status', 'BLOCKED', 'message', 'Trading window closed.');
            END IF;
        ELSE
            -- Standard Window
            -- Block if time is OUTSIDE (Before Start OR After End)
            IF v_now_time < v_start_time OR v_now_time > v_end_time THEN
                 INSERT INTO violations (user_id, reason, details) VALUES (v_user_id, 'TIME_WINDOW_VIOLATION', jsonb_build_object('window', v_rules->>'trading_window_start' || '-' || v_rules->>'trading_window_end'));
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

    -- Check Max Loss after this trade
    IF p_status = 'CLOSED' AND p_pnl < 0 THEN
         v_current_pnl := v_current_pnl + p_pnl;
         IF v_current_pnl <= (-1 * ABS(v_max_loss)) THEN
            INSERT INTO violations (user_id, reason, details) VALUES (v_user_id, 'MAX_LOSS_HIT', jsonb_build_object('limit', v_max_loss, 'current', v_current_pnl));
            INSERT INTO daily_locks (user_id, reason) VALUES (v_user_id, 'MAX_LOSS_HIT') ON CONFLICT DO NOTHING;
             RETURN jsonb_build_object('status', 'SUCCESS', 'message', 'Trade logged. DAILY LOSS LIMIT HIT. Account Locked.');
         END IF;
    END IF;

    RETURN jsonb_build_object('status', 'SUCCESS', 'message', 'Trade logged successfully.');
END;
$$;
