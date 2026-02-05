
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase Service Key or URL');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verify() {
    try {
        console.log('--- Verification Start ---');

        // 1. Counts
        const { count: pCount } = await supabase.from('proyectos_servicios').select('*', { count: 'exact', head: true });
        const { count: rCount } = await supabase.from('regiones').select('*', { count: 'exact', head: true });
        const { count: eCount } = await supabase.from('etapas').select('*', { count: 'exact', head: true });

        console.log(`Proyectos: ${pCount}`);
        console.log(`Regiones: ${rCount}`);
        console.log(`Etapas: ${eCount}`);

        // 2. Check Specifics
        const { data: vraem } = await supabase.from('regiones').select('*').ilike('descripcion', '%VRAEM%');
        if (vraem && vraem.length > 0) {
            console.log('✅ Found Region VRAEM:', vraem.map(r => r.descripcion).join(', '));
        } else {
            console.error('❌ Region VRAEM NOT FOUND');
        }

        const { data: etapa1 } = await supabase.from('etapas').select('*').ilike('descripcion', '%Por definir%');
        if (etapa1 && etapa1.length > 0) {
            console.log('✅ Found Etapa "Por definir":', etapa1.map(e => e.descripcion).join(', '));
        } else {
            console.error('❌ Etapa "Por definir" NOT FOUND');
        }

        // 3. Sample Project
        const { data: sample } = await supabase.from('proyectos_servicios').select('nombre, año, monto_total').limit(3);
        console.log('Sample Projects:', sample);

        console.log('--- Verification End ---');

    } catch (e) {
        console.error('Verification Error:', e);
    }
}

verify();
