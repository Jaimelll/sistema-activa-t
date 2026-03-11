require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('--- Checking proyectos_servicios schema ---');
    const { data, error } = await supabase
        .from('proyectos_servicios')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error selecting from proyectos_servicios:', error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log('Sample row:', JSON.stringify(data[0], null, 2));
        console.log('Keys:', Object.keys(data[0]));
        // Check if id is number or uuid
        console.log('Type of id:', typeof data[0].id);
    } else {
        console.log('No data found in proyectos_servicios');
    }
}

checkSchema();
