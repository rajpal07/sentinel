-- ADD MISSING COLUMNS TO TRADES TABLE
-- The submit_trade function expects these columns but they don't exist yet.

ALTER TABLE trades ADD COLUMN IF NOT EXISTS strategy TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS timeframe TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS notes TEXT;
