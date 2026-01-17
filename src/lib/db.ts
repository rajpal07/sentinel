import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.udrbmgnlhjnhdtssxydm:NClUyt5k7dn9OLzy@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

export const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase in many environments
});

// Helper for single queries
export const query = (text: string, params?: any[]) => pool.query(text, params);
