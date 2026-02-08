
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function count() {
    console.log('--- Verifying Counts ---');

    const { count: countP, error: errorP } = await supabase.from('proyectos_servicios').select('*', { count: 'exact', head: true });
    if (errorP) console.error('Error Proyectos:', errorP.message);
    else console.log('Proyectos Count:', countP);

    const { count: countB, error: errorB } = await supabase.from('becas').select('*', { count: 'exact', head: true });
    if (errorB) console.error('Error Becas:', errorB.message);
    else console.log('Becas Count:', countB);
}

count();
