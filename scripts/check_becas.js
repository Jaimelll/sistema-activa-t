
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://zhtujzuuwecnqdecazam.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_QVGaosj1XyHaNrPE1MEiKA_XFM7gExF';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Checking Becas Table ---');
    const { data, error } = await supabase
        .from('becas')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error (Table likely missing):', error.message);
    } else {
        console.log('Success! Table exists.');
        console.log('Data found:', data.length);
    }
}

check();
