
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase Service Key or URL');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verify() {
    console.log('--- VERIFICATION ---');

    const check = async (table) => {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) console.error(`Error ${table}:`, error.message);
        else console.log(`${table}: ${count}`);
    };

    await check('proyectos_servicios'); // Expect ~515
    await check('becas');               // Expect ~811
    await check('avance_proyecto');     // Expect > 0
    await check('programa_proyecto');   // Expect > 0

    // Check Stage 6 ID
    const { data: st6 } = await supabase.from('etapas').select('id, descripcion').eq('id', 6).single();
    console.log('Stage 6:', st6);

    // Check Lanzamiento ID 2
    const { data: st2 } = await supabase.from('etapas').select('id, descripcion').eq('id', 2).single();
    console.log('Stage 2:', st2);
}

verify();
