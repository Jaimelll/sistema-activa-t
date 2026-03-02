const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runSQL() {
    console.log('--- Creating table pagos_gestoras ---');

    const sql = `
        CREATE TABLE IF NOT EXISTS public.pagos_gestoras (
            gestora TEXT PRIMARY KEY,
            costo_total_gestora NUMERIC DEFAULT 0,
            cobrado_gestora NUMERIC DEFAULT 0,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        -- Reset RLS and policies for simplicity in local dev (if possible)
        ALTER TABLE public.pagos_gestoras ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public read" ON public.pagos_gestoras;
        CREATE POLICY "Allow public read" ON public.pagos_gestoras FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Allow public insert" ON public.pagos_gestoras;
        CREATE POLICY "Allow public insert" ON public.pagos_gestoras FOR INSERT WITH CHECK (true);
        DROP POLICY IF EXISTS "Allow public update" ON public.pagos_gestoras;
        CREATE POLICY "Allow public update" ON public.pagos_gestoras FOR UPDATE USING (true);
    `;

    // Since we don't have a direct SQL tool, we'll use a hack or assume we can run it via rpc if configured.
    // BUT we can use pg-native or just 'postgres' if installed. 
    // Wait, I can try to use the 'run_sql' pattern if it exists, or just tell the user.
    // ACTUALLY, I can use the existing 'scripts/apply_schema_pg.js' or similar if available.

    console.log('Attempting to apply SQL via Supabase REST API (this might fail if not RPC)...');
    // Most Supabase setups have an RPC for running SQL in dev.
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
        console.error('Error executing SQL:', error.message);
        console.log('\nMANUAL ACTION REQUIRED: Please run the following SQL in your Supabase SQL Editor:');
        console.log(sql);
    } else {
        console.log('Table created successfully!');
    }
}

runSQL();
