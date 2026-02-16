
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProjects() {
    const { data, error } = await supabase
        .from('avance_proyecto')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        if (data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
            console.log('First 5 rows:', data.map(r => ({ id: r.id, codigo: r.codigo_proyecto, numero: r.numero })));
        } else {
            console.log('No data found.');
        }
    }
}

checkProjects();
