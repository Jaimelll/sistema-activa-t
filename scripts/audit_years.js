const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing config');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function audit() {
    console.log('--- SCRIPT AUDIT START ---');
    console.log('Querying projects_services for year...');
    const { data, error } = await supabase.from('proyectos_servicios').select('año');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Total Rows: ${data.length}`);
        const uniqueYears = [...new Set(data.map(d => d.año))];
        console.log('Unique Years Found:', uniqueYears);
        console.log('Raw Data Sample:', data.slice(0, 10));
    }
}

audit();
