
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) { console.log('No creds'); process.exit(1); }

const supabase = createClient(url, key);

async function verify() {
    const { data, error } = await supabase
        .from('proyectos_servicios')
        .select('id, nombre, beneficiarios, estado')
        .eq('id', 498)
        .single();

    if (error) console.error('Error:', error);
    else console.log('Project 498:', JSON.stringify(data, null, 2));
}

verify();
