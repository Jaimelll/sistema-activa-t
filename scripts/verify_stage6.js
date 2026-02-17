
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) { console.log('No creds'); process.exit(1); }

const supabase = createClient(url, key);

async function verifyStage6() {
    // Check for any project with Stage 6
    const { data, error } = await supabase
        .from('avance_proyecto')
        .select('*')
        .eq('etapa_id', 6)
        .limit(5);

    if (error) console.error('Error:', error);
    else {
        console.log(`Found ${data.length} Stage 6 records.`);
        if (data.length > 0) console.log('Sample:', JSON.stringify(data[0], null, 2));
    }

    // Check Project 1 specifically
    const { data: p1, error: e1 } = await supabase
        .from('avance_proyecto')
        .select('*')
        .eq('proyecto_id', 1)
        .eq('etapa_id', 6);

    if (e1) console.error('Error P1:', e1);
    else console.log('Project 1 Stage 6:', JSON.stringify(p1, null, 2));
}

verifyStage6();
