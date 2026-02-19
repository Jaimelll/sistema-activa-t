
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const counts = {};
    for (const t of ['proyectos_servicios', 'becas', 'avance_proyecto', 'programa_proyecto']) {
        const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
        counts[t] = count;
    }
    console.log(JSON.stringify(counts));
}
check();
