const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTriggers() {
    console.log('Checking triggers for avance_beca and becas_nueva...');
    const { data, error } = await supabase.rpc('get_triggers', {}); 
    // Wait, get_triggers might not exist. Let's try direct query
    const { data: triggers, error: err } = await supabase.from('avance_beca').select('*').limit(0); // Dummy to check connection
    
    if (err) {
        console.error('Connection error:', err);
        return;
    }

    const { data: triggerList, error: tErr } = await supabase
        .rpc('f_check_triggers', { table_name: 'avance_beca' }); // I'll hope the user has a helper or I'll use a raw query if possible

    // Raw query alternative
    const query = `
        SELECT 
            tgname AS trigger_name,
            relname AS table_name,
            proname AS function_name
        FROM pg_trigger
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
        JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
        WHERE relname IN ('avance_beca', 'becas_nueva');
    `;
    
    // Supabase JS doesn't support raw SQL easily without a RPC helper.
    // I'll check if I can find any RPC in the schema.
    console.log('Querying pg_trigger via RPC (if allowed)...');
}

checkTriggers();
