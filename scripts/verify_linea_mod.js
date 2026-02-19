
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
    // Check for NULL Linea or Modalidad
    const { count: nullLinea } = await supabase.from('proyectos_servicios').select('*', { count: 'exact', head: true }).is('linea_id', null);
    const { count: nullMod } = await supabase.from('proyectos_servicios').select('*', { count: 'exact', head: true }).is('modalidad_id', null);

    // Check Sample
    const { data: sample } = await supabase.from('proyectos_servicios').select('id, nombre, linea_id, modalidad_id').limit(5);

    console.log(`Null Linea: ${nullLinea}`);
    console.log(`Null Modalidad: ${nullMod}`);
    console.log('Sample:', JSON.stringify(sample, null, 2));

    if (nullLinea > 0 || nullMod > 0) {
        console.error('FAIL: Still have nulls.');
        process.exit(1);
    } else {
        console.log('SUCCESS: No nulls found.');
    }
}
verify();
