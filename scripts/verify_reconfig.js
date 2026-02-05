
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verify() {
    try {
        console.log('--- Verification Reconfig ---');

        // 1. Counts
        const { count: p } = await supabase.from('proyectos_servicios').select('*', { count: 'exact', head: true });
        const { count: e } = await supabase.from('ejes').select('*', { count: 'exact', head: true });
        const { count: l } = await supabase.from('lineas').select('*', { count: 'exact', head: true });
        const { count: r } = await supabase.from('regiones').select('*', { count: 'exact', head: true });

        console.log(`Proyectos: ${p}`);
        console.log(`Ejes: ${e}`);
        console.log(`Lineas: ${l}`);
        console.log(`Regiones: ${r}`);

        // 2. Null Checks
        const { count: nullEje } = await supabase.from('proyectos_servicios').select('*', { count: 'exact', head: true }).is('eje_id', null);
        const { count: nullLinea } = await supabase.from('proyectos_servicios').select('*', { count: 'exact', head: true }).is('linea_id', null);

        if (nullEje > 0) console.error(`❌ FAILURE: ${nullEje} projects have NULL eje_id`);
        else console.log('✅ SUCCESS: 0 projects with NULL eje_id');

        if (nullLinea > 0) console.error(`❌ FAILURE: ${nullLinea} projects have NULL linea_id`);
        else console.log('✅ SUCCESS: 0 projects with NULL linea_id');

        // 3. Sample
        const { data: sample } = await supabase.from('proyectos_servicios')
            .select('nombre, estado, ejes(descripcion), lineas(descripcion)')
            .limit(2);

        console.log('Sample:', JSON.stringify(sample, null, 2));

        console.log('--- Verification End ---');
    } catch (e) { console.error(e); }
}

verify();
