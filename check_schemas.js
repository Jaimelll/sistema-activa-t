const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchemas() {
    const tables = [
        'institucion', 'condicion', 'formato', 'naturaleza_ie', 
        'tipo_estudio', 'modalidades', 'regiones', 'etapas', 'becas_nueva'
    ];

    console.log('Checking table schemas...');
    for (const table of tables) {
        // Query to get column names (Supabase doesn't have a direct 'describe table' but we can select 0 rows)
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
        
        if (error) {
            console.log(`Table ${table} Error: ${error.message}`);
        } else {
            console.log(`Table ${table} Columns:`, data.length > 0 ? Object.keys(data[0]) : 'No data, columns unknown via select');
            // Try to get column names via RPC or just query one row if it exists
        }
    }
}

checkSchemas();
