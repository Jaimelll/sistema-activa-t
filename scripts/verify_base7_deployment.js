const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('CRITICAL: Missing Supabase Service Key or URL');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
});

async function verify() {
    console.log('--- VERIFICATION START ---');

    // 1. Check Projects Count
    const { count: projCount, error: errP } = await supabase.from('proyectos_servicios').select('*', { count: 'exact', head: true });
    if (errP) console.error('Error counting projects:', errP);
    console.log(`Projects Count: ${projCount}`);

    // 2. Check Stage ID 2 Name (Should be 'Lanzamiento')
    const { data: s2, error: errS } = await supabase.from('etapas').select('*').eq('id', 2).single();
    if (errS) console.error('Stage 2 not found:', errS);
    else {
        console.log(`Stage 2 Name (DB): ${s2.descripcion}`);
        if (s2.descripcion === 'Lanzamiento') console.log('✅ Stage 2 Name is correct.');
        else console.error('❌ Stage 2 Name is INCORRECT.');
    }

    // 3. Check Program Records (Any)
    const { count: progCount, error: errProg } = await supabase.from('programa_proyecto').select('*', { count: 'exact', head: true });
    if (errProg) console.error('Error counting program:', errProg);
    else {
        console.log(`Program records count: ${progCount}`);
        if (progCount > 0) console.log('✅ Program data exists.');
    }

    // 4. Check Avance Records (Any)
    const { count: advCount, error: errAdv } = await supabase.from('avance_proyecto').select('*', { count: 'exact', head: true });
    if (errAdv) console.error('Error counting advances:', errAdv);
    else {
        console.log(`Advance records count: ${advCount}`);
        if (advCount > 0) console.log('✅ Advance data exists.');
    }

    console.log('--- VERIFICATION END ---');
}

verify().catch(console.error);
