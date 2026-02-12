
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Key');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function count() {
    const { count: c1, error: e1 } = await supabase.from('proyectos_servicios').select('*', { count: 'exact', head: true });
    if (e1) console.error('Error Proyectos:', e1.message);
    else console.log('Proyectos Count:', c1);

    const { count: c2, error: e2 } = await supabase.from('becas').select('*', { count: 'exact', head: true });
    if (e2) console.error('Error Becas:', e2.message);
    else console.log('Becas Count:', c2);
}

count();
