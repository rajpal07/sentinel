import { betterAuth } from "better-auth";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.udrbmgnlhjnhdtssxydm:NClUyt5k7dn9OLzy@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

export const auth = betterAuth({
    database: pool,
    emailAndPassword: {
        enabled: true
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }
    }
    // We already have 'profiles' etc, but Better Auth needs its own 'user', 'session', 'account' tables.
    // We will let it create them. It uses 'user' by default. 
    // Since we are migrating, we might want to map to existing?
    // User wants "Better Auth to Email & Password". 
    // The previous 'auth.users' is in a different schema (auth). 
    // Better Auth will create tables in 'public'.
});
