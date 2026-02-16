
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function diagnose() {
    // 1. Read Excel 'numero' sample
    const workbook = xlsx.readFile('Base7.xlsx');
    const sheet = workbook.Sheets['proyecto_servicio'];
    const data = xlsx.utils.sheet_to_json(sheet);

    console.log('--- Excel Sample (First 5 rows) ---');
    data.slice(0, 5).forEach(r => console.log(`Numero: ${r.numero}, Proyecto: ${r.proyecto || r.nombre || 'N/A'}`));

    // 2. Read DB 'proyectos_servicios' sample
    console.log('\n--- DB proyectos_servicios Sample (First 5 rows) ---');
    const { data: dbProjects, error } = await supabase
        .from('proyectos_servicios')
        .select('id, codigo_proyecto, nombre')
        .limit(5);

    if (error) console.error(error);
    else console.table(dbProjects);
}

diagnose();
