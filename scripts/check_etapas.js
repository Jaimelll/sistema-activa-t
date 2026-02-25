const { createClient } = require('@supabase/supabase-js');

async function checkData() {
    const supabaseUrl = 'https://zhtujzuuwecnqdecazam.supabase.co';
    const supabaseServiceKey = 'sb_secret_QVGaosj1XyHaNrPE1MEiKA_XFM7gExF';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
        .from('proyectos_servicios')
        .select('id, codigo_proyecto, estado, etapa_id, etapas(descripcion)')
        .limit(20);

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    console.log('--- DB DATA AUDIT ---');
    console.log('Total checking:', data.length);
    data.forEach(p => {
        const etapaDesc = p.etapas?.descripcion || 'MISSING_DESC';
        const etapaId = p.etapa_id || 'NULL_ID';
        console.log(`Proyecto: ${p.codigo_proyecto || p.id} | ID Etapa: ${etapaId} | Descripcion: ${etapaDesc} | Estado: ${p.estado}`);
    });

    const nullEtapas = data.filter(p => !p.etapas?.descripcion).length;
    console.log(`Summary: Found ${nullEtapas} records with missing stage descriptions.`);
}

checkData();
