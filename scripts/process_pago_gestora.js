const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const FILE_PATH = 'c:/trabajo/fondo/Base7.xlsx';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log('--- Processing pago_gestora ---');

    // 1. Read Excel
    const workbook = xlsx.readFile(FILE_PATH);
    const sheet = workbook.Sheets['pago_gestora'];
    const data = xlsx.utils.sheet_to_json(sheet);

    // 2. Calculate
    const today = new Date();
    let totalCosto = 0;
    let totalCobrado = 0;

    data.forEach(row => {
        const monto = parseFloat(row['Monto (S/)']) || 0;
        totalCosto += monto;

        // Mes de Pago is a serial number in Excel
        const mesPagoSerial = row['Mes de Pago'];
        const dateObj = xlsx.SSF.parse_date_code(mesPagoSerial);
        const mesPagoDate = new Date(dateObj.y, dateObj.m - 1, dateObj.d);

        if (mesPagoDate <= today) {
            totalCobrado += monto;
        }
    });

    console.log(`Gestora: FONDOEMPLEO`);
    console.log(`Total Costo: ${totalCosto}`);
    console.log(`Total Cobrado (to ${today.toISOString()}): ${totalCobrado}`);

    // 3. Update Supabase
    // We assume the table exists or we create it via RPC if needed, 
    // but better use upsert if we can ensure table exists.
    // The user said: "Crea (o actualiza) la tabla pagos_gestoras"

    // Check if table exists by trying a select
    const { error: checkError } = await supabase.from('pagos_gestoras').select('gestora').limit(1);

    if (checkError && checkError.message.includes('does not exist')) {
        console.log('Table pagos_gestoras does not exist. Please run SQL to create it:');
        console.log(`
            CREATE TABLE public.pagos_gestoras (
                gestora TEXT PRIMARY KEY,
                costo_total_gestora NUMERIC DEFAULT 0,
                cobrado_gestora NUMERIC DEFAULT 0,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            ALTER TABLE public.pagos_gestoras ENABLE ROW LEVEL SECURITY;
            CREATE POLICY "Allow public read" ON public.pagos_gestoras FOR SELECT USING (true);
            CREATE POLICY "Allow public insert" ON public.pagos_gestoras FOR INSERT WITH CHECK (true);
            CREATE POLICY "Allow public update" ON public.pagos_gestoras FOR UPDATE USING (true);
        `);
        // For local development, we might try to create it if we had a service role key, 
        // but here we might just try to insert and see.
    }

    const { error: upsertError } = await supabase.from('pagos_gestoras').upsert({
        gestora: 'FONDOEMPLEO',
        costo_total_gestora: totalCosto,
        cobrado_gestora: totalCobrado,
        updated_at: new Date().toISOString()
    });

    if (upsertError) {
        console.error('Error upserting data:', upsertError.message);
    } else {
        console.log('Data upserted successfully!');
    }
}

run();
