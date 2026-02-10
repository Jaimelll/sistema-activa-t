
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Env Vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    console.log('Testing Supabase Query...');
    const { data, error } = await supabase
        .from('proyectos_servicios')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('First Record Keys:', Object.keys(data[0]));
        console.log('First Record etapa_id:', data[0].etapa_id);
        console.log('First Record estado:', data[0].estado);
    }
}

testQuery();
