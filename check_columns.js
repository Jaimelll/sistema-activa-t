require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data: rowP } = await supabase.from('proyectos').select('*').limit(1);
    if (rowP && rowP.length > 0) {
        console.log('PROYECTOS_COLUMNS:' + JSON.stringify(Object.keys(rowP[0])));
    } else {
        console.log('PROYECTOS_EMPTY');
    }

    const { data: rowAP } = await supabase.from('avance_proyecto').select('*').limit(1);
    if (rowAP && rowAP.length > 0) {
        console.log('AVANCE_PROYECTO_COLUMNS:' + JSON.stringify(Object.keys(rowAP[0])));
    } else {
        console.log('AVANCE_PROYECTO_EMPTY');
    }
}

checkSchema();
