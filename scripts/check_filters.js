
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase Credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkFilters() {
    console.log('--- CHECKING LINEAS ---');
    const { data: lineas, error: errLineas } = await supabase
        .from('lineas')
        .select('id, descripcion')
        .order('id', { ascending: true });

    if (errLineas) console.error('Error lineas:', errLineas);
    else console.log('Lineas found:', lineas?.length, lineas ? lineas.slice(0, 3) : 'null');

    console.log('\n--- CHECKING EJES ---');
    const { data: ejes, error: errEjes } = await supabase
        .from('ejes')
        .select('id, descripcion') // Removed numero just in case, but let's see schema
        .order('id', { ascending: true });

    if (errEjes) console.error('Error ejes:', errEjes);
    else console.log('Ejes found:', ejes?.length, ejes ? ejes.slice(0, 3) : 'null');
}

checkFilters();
