
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRPCs() {
    console.log('--- Checking for RPC functions in public schema ---');
    const { data, error } = await supabase.rpc('get_rpc_functions'); // This is a common rpc if added

    if (error) {
        console.log('get_rpc_functions not found. Trying query on pg_proc...');
        // We can't query pg_proc directly via REST unless we have a view or rpc.
    } else {
        console.log('Available RPCs:', data);
    }
}

checkRPCs();
