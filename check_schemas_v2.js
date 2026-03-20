const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getFullSchema() {
    const tables = [
        'institucion', 'condicion', 'formato', 'naturaleza_ie', 
        'tipo_estudio', 'modalidades', 'regiones', 'etapas', 'becas_nueva'
    ];

    console.log('Fetching detailed schema from information_schema...');
    
    for (const table of tables) {
        const { data, error } = await supabase.rpc('get_table_columns_v2', { t_name: table });
        
        // If RPC doesn't exist, we might have to use a direct query if possible, 
        // but Supabase JS doesn't allow raw SQL easily without an RPC.
        // Let's try a common trick: querying the table with a non-existent column to see the error,
        // OR just try to check if there is an existing RPC.
        
        if (error) {
            // Let's try another way: query one row and see if we can get keys, 
            // but we already tried and it's empty.
            // Plan B: Create a temporary RPC if we have permissions? No.
            // Plan C: Look for migrations or schema files again.
            console.log(`Table ${table} Error: ${error.message}`);
        } else {
            console.log(`Table ${table} Columns:`, data);
        }
    }
}

// Since I don't know if get_table_columns_v2 exists, I'll try to find any existing RPCs
async function listRPCs() {
    // Usually we can't list RPCs easily via JS client without knowing them.
    // But we saw check_rpcs.js in the directory! Let's check it.
}

getFullSchema();
