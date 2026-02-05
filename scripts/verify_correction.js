
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
    console.log('--- Verify Correction ---');

    // 1. Check ID binding for Regions
    const { count: nullRegions } = await supabase.from('proyectos_servicios').select('*', { count: 'exact', head: true }).is('region_id', null);

    // 2. Check Contrapartida > 0
    const { count: nonZero } = await supabase.from('proyectos_servicios').select('*', { count: 'exact', head: true }).gt('monto_contrapartida', 0);
    const { data: zeros } = await supabase.from('proyectos_servicios').select('nombre, monto_fondoempleo, monto_contrapartida').eq('monto_contrapartida', 0).limit(3);

    console.log(`❌ Projects with NULL Region: ${nullRegions}`);
    console.log(`✅ Projects with Contrapartida > 0: ${nonZero}`);

    if (nonZero === 0) {
        console.error('All Contrapartida values are 0. Logic or Data issue.');
        console.log('Sample Zeros:', zeros);
    }

    console.log('--- End ---');
}
verify();
