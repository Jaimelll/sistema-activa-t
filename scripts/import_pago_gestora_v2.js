const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const xlsx = require('xlsx');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FILE_PATH = 'c:/trabajo/fondo/Base7.xlsx';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('--- Corrected Processing pago_gestora (v2) ---');

    // 1. Ensure Table Exists
    const createSql = `
        CREATE TABLE IF NOT EXISTS public.pagos_gestoras (
            gestora TEXT PRIMARY KEY,
            costo_total_gestora NUMERIC DEFAULT 0,
            cobrado_gestora NUMERIC DEFAULT 0,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        ALTER TABLE public.pagos_gestoras ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public read" ON public.pagos_gestoras;
        CREATE POLICY "Allow public read" ON public.pagos_gestoras FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Allow public insert" ON public.pagos_gestoras;
        CREATE POLICY "Allow public insert" ON public.pagos_gestoras FOR INSERT WITH CHECK (true);
        DROP POLICY IF EXISTS "Allow public update" ON public.pagos_gestoras;
        CREATE POLICY "Allow public update" ON public.pagos_gestoras FOR UPDATE USING (true);
    `;

    console.log('Applying schema...');
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql: createSql });
    if (sqlError) {
        console.warn('RPC exec_sql failed, attempting table insert directly (table might exist):', sqlError.message);
    }

    // 2. Read Excel
    const workbook = xlsx.readFile(FILE_PATH);
    const sheet = workbook.Sheets['pago_gestora'];
    const data = xlsx.utils.sheet_to_json(sheet);

    // 3. Process
    const today = new Date();
    const results = {};

    data.forEach(row => {
        const gestoraRaw = row['getora'] || row['gestora'];
        if (!gestoraRaw) return;
        const gestora = gestoraRaw.trim();

        if (!results[gestora]) results[gestora] = { total: 0, cobrado: 0 };

        const monto = parseFloat(row['Monto (S/)']) || 0;
        results[gestora].total += monto;

        const mesPagoSerial = row['Mes de Pago'];
        const dateObj = xlsx.SSF.parse_date_code(mesPagoSerial);
        const mesPagoDate = new Date(dateObj.y, dateObj.m - 1, dateObj.d);

        if (mesPagoDate <= today) {
            results[gestora].cobrado += monto;
        }
    });

    console.log('Aggregation Results:', results);

    // 4. Upload
    for (const [gestora, values] of Object.entries(results)) {
        console.log(`Upserting ${gestora}...`);
        const { error: upsertError } = await supabase.from('pagos_gestoras').upsert({
            gestora: gestora,
            costo_total_gestora: values.total,
            cobrado_gestora: values.cobrado,
            updated_at: new Date().toISOString()
        });

        if (upsertError) {
            console.error(`Error upserting ${gestora}:`, upsertError.message);
        } else {
            console.log(`Success for ${gestora}`);
        }
    }
}

run();
