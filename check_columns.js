require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data: row } = await supabase.from('becas_nueva').select('*').limit(1);
    if (row && row.length > 0) {
        console.log('BECAS_NUEVA_COLUMNS:' + JSON.stringify(Object.keys(row[0])));
    } else {
        console.log('BECAS_NUEVA_EMPTY');
    }

    const { data: rowAvance } = await supabase.from('avance_beca').select('*').limit(1);
    if (rowAvance && rowAvance.length > 0) {
        console.log('AVANCE_BECA_COLUMNS:' + JSON.stringify(Object.keys(rowAvance[0])));
    } else {
        console.log('AVANCE_BECA_EMPTY');
    }
}

checkSchema();
