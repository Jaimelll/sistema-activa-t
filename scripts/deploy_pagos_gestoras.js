const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FILE_PATH = path.resolve(__dirname, '../../Base7.xlsx'); // c:/trabajo/fondo/Base7.xlsx

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SQL_CREATE = `
CREATE TABLE IF NOT EXISTS public.pagos_gestoras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gestora TEXT,
    nro_pago INTEGER,
    mes_pago DATE,
    periodo_servicio TEXT,
    monto NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pagos_gestoras ENABLE ROW LEVEL SECURITY;

-- Policies for display
DROP POLICY IF EXISTS "Public Select" ON public.pagos_gestoras;
CREATE POLICY "Public Select" ON public.pagos_gestoras FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service Role All" ON public.pagos_gestoras;
CREATE POLICY "Service Role All" ON public.pagos_gestoras FOR ALL USING (true);
`;

async function deploy() {
    console.log('--- DEPLOYING pagos_gestoras ---');

    // 1. Attempt to create table via RPC
    console.log('Attempting to create table via RPC...');
    const { error: rpcError } = await supabase.rpc('exec_sql', { query: SQL_CREATE });
    if (rpcError) {
        console.warn('RPC exec_sql failed (likely missing):', rpcError.message);
        console.log('Checking if table exists by trying a select...');
    }

    // 2. Read Excel
    console.log(`Reading: ${FILE_PATH}`);
    const wb = xlsx.readFile(FILE_PATH);
    const ws = wb.Sheets['pago_gestora'];
    if (!ws) {
        console.error('Error: Hoja pago_gestora no encontrada.');
        return;
    }

    const rows = xlsx.utils.sheet_to_json(ws);
    console.log(`Found ${rows.length} rows in Excel.`);

    // 3. Prepare Data
    const inserts = rows.map(row => {
        const serialDate = row['Mes de Pago'];
        let isoDate = null;
        let pServicio = null;

        if (typeof serialDate === 'number') {
            const dateObj = xlsx.SSF.parse_date_code(serialDate);
            const m = String(dateObj.m).padStart(2, '0');
            // Regla del Día 07: Siempre guardar como día 7
            isoDate = `${dateObj.y}-${m}-07`;

            // Derive periodo_servicio (e.g. Sep-2025)
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            pServicio = `${months[dateObj.m - 1]}-${dateObj.y}`;
        }

        return {
            gestora: row['getora'] || row['gestora'],
            nro_pago: row['N.º de Pago'],
            mes_pago: isoDate,
            periodo_servicio: pServicio,
            monto: row['Monto (S/)']
        };
    });

    // 4. Clear and Insert (Isolated Load)
    console.log('Truncating existing data (if table exists)...');
    const { error: delError } = await supabase.from('pagos_gestoras').delete().neq('gestora', '');
    if (delError && delError.code === '42P01') {
        console.error('CRITICAL ERROR: Table pagos_gestoras does not exist and RPC failed to create it.');
        console.log('Please run this SQL in your Supabase Console:');
        console.log(SQL_CREATE);
        return;
    }

    console.log(`Inserting ${inserts.length} records...`);
    const { error: insError } = await supabase.from('pagos_gestoras').insert(inserts);

    if (insError) {
        console.error('Error inserting data:', insError.message);
    } else {
        console.log('Data loaded successfully!');

        // 5. Verification SQL
        console.log('Running Verification: SELECT COUNT(*) FROM pagos_gestoras');
        const { data: countData, error: countError } = await supabase
            .from('pagos_gestoras')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('Verification failed:', countError.message);
        } else {
            console.log(`VERIFICATION RESULT: Total records in pagos_gestoras = ${countData.length || '??'} (Count: ${countData})`);
            // The exact count is trickier with supabase-js head:true, let's just select all if it's small.
            const { count } = await supabase.from('pagos_gestoras').select('*', { count: 'exact', head: true });
            console.log(`STRICT VERIFICATION: COUNT = ${count}`);
        }
    }
}

deploy();
