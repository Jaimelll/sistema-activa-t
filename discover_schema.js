const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function discover() {
    const tables = ['becas_nueva', 'ejes', 'lineas', 'institucion', 'regiones', 'etapas'];
    for (const table of tables) {
        console.log(`--- Table: ${table} ---`);
        // Trick to get column names: query one row, even if empty, some clients return headers
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Error: ${error.message}`);
        } else {
            // If data is empty, we still don't know columns via select '*' in Supabase JS
            // Let's try to insert an empty object to see the error or the resulting columns
            const { error: insError } = await supabase.from(table).insert({}).select();
            if (insError) {
                console.log(`Insert Error (lists columns often): ${insError.message}`);
            }
        }
    }
}

discover();
