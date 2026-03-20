const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    const tables = [
        'institucion', 'condicion', 'formato', 'naturaleza_ie', 
        'tipo_estudio', 'modalidades', 'regiones', 'etapas', 'becas_nueva'
    ];

    console.log('Checking tables in Supabase...');
    for (const table of tables) {
        const { data, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            console.log(`Table ${table}: NOT FOUND or Error: ${error.message}`);
        } else {
            console.log(`Table ${table}: EXISTS`);
        }
    }
}

checkTables();
