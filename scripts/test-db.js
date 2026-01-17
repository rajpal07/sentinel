require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const connectionString = 'postgresql://postgres.udrbmgnlhjnhdtssxydm:NClUyt5k7dn9OLzy@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase in some envs
});

async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('Successfully connected to Supabase PostgreSQL!');
        const res = await client.query('SELECT NOW()');
        console.log('Current Database Time:', res.rows[0].now);

        // Check tables
        const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log('Tables found:', tables.rows.map(r => r.table_name).join(', '));

        client.release();
        process.exit(0);
    } catch (err) {
        console.error('Connection error:', err);
        process.exit(1);
    }
}

testConnection();
