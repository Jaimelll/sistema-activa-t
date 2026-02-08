
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNulls() {
    console.log('--- Checking for Nulls ---');

    // Check Becas
    const { data: becas, error } = await supabase
        .from('becas')
        .select('id, nombre, monto_fondoempleo, eje_id, region_id')
        .is('nombre', null); // Check if nombre is null

    if (error) console.error(error);

    // Check specific columns for a sample
    const { data: sample } = await supabase.from('becas').select('*').limit(5);
    console.log('Sample Beca:', JSON.stringify(sample[0], null, 2));

    const { count } = await supabase.from('becas').select('*', { count: 'exact', head: true });
    console.log(`Total Becas: ${count}`);

    // Count nulls in critical fields
    const { count: nullEje } = await supabase.from('becas').select('id', { count: 'exact', head: true }).is('eje_id', null);
    console.log(`Becas with NULL eje_id: ${nullEje}`);

    const { count: nullRegion } = await supabase.from('becas').select('id', { count: 'exact', head: true }).is('region_id', null);
    console.log(`Becas with NULL region_id: ${nullRegion}`);

    const { count: nullMonto } = await supabase.from('becas').select('id', { count: 'exact', head: true }).is('monto_fondoempleo', null);
    console.log(`Becas with NULL monto_fondoempleo: ${nullMonto}`);
}

checkNulls();
