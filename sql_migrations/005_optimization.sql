-- OPTIMIZATIONS & CLEANUP

-- 1. Create Index for PnL/Frequency Calculations (Primary Query Pattern)
CREATE INDEX IF NOT EXISTS idx_trades_user_executed ON trades(user_id, executed_at);

-- 2. Create Index for Daily Lock Checks
CREATE INDEX IF NOT EXISTS idx_daily_locks_user_date ON daily_locks(user_id, lock_date);

-- 3. Cleanup Unused Architecture
-- The 'violations' table is legacy (replaced by 'daily_locks').
DROP TABLE IF EXISTS violations;
