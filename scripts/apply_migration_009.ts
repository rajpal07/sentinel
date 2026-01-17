import { pool } from '../src/lib/db';
import fs from 'fs';
import path from 'path';

async function runMigration() {
    try {
        const migrationPath = path.join(process.cwd(), 'sql_migrations', '009_migrate_to_better_auth_schema.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Applying migration 009...');
        await pool.query(sql);
        console.log('Migration 009 applied successfully.');
    } catch (err: any) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
