require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const connectionString = 'postgresql://postgres.udrbmgnlhjnhdtssxydm:NClUyt5k7dn9OLzy@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function debugPolicies() {
    const client = await pool.connect();
    try {
        // List all policies
        const policies = await client.query(`
      SELECT schemaname, tablename, policyname 
      FROM pg_policies 
      WHERE schemaname = 'public'
    `);
        console.log('--- Existing Policies ---');
        policies.rows.forEach(r => console.log(`${r.tablename}: ${r.policyname}`));

        // Check violations table existence again
        const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log('--- Tables ---');
        tables.rows.forEach(r => console.log(r.table_name));

    } finally {
        client.release();
        process.exit(0);
    }
}

debugPolicies();
