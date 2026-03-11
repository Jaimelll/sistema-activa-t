require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    const ids = [286, 287];
    const { data, error } = await supabase
        .from('proyectos_servicios')
        .select('id, monto_contrapartida')
        .in('id', ids);

    if (error) {
        console.error('Error verifying IDs:', error.message);
    } else {
        console.log('--- Verification ---');
        data.forEach(row => {
            console.log(`ID: ${row.id}, Monto DB: ${row.monto_contrapartida}`);
        });
        console.log('Esperados (Excel): ID 286 -> 619226.57, ID 287 -> 199918');
    }
}

verify();
