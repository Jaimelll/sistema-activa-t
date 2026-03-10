
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify2026() {
    console.log('--- Verificando Datos 2026 en Supabase ---');
    const { data, error } = await supabase
        .from('finanzas_anual')
        .select('*')
        .eq('año', 2026);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.table(data.map(d => ({ Rubro: d.rubro, Monto: d.monto })));
    }
}

verify2026();
