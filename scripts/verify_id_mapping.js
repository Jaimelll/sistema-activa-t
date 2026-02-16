
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function verifyMapping() {
    console.log('--- Verifying ID Mapping ---');

    // 1. DB Stats
    const { data: stats, error: statError } = await supabase
        .from('proyectos_servicios')
        .select('id')
        .order('id', { ascending: true });

    if (statError) {
        console.error(statError);
        return;
    }

    const ids = stats.map(r => r.id);
    console.log(`DB Record Count: ${ids.length}`);
    console.log(`Min ID: ${Math.min(...ids)}`);
    console.log(`Max ID: ${Math.max(...ids)}`);
    console.log(`First 5 IDs: ${ids.slice(0, 5).join(', ')}`);

    // 2. Excel Sample
    const workbook = xlsx.readFile('Base7.xlsx');
    const sheet = workbook.Sheets['proyecto_servicio'];
    const excelData = xlsx.utils.sheet_to_json(sheet);

    console.log(`Excel Row Count: ${excelData.length}`);
    console.log('--- Sample Comparison ---');

    // Compare first 3 valid rows
    for (let i = 0; i < 3; i++) {
        const row = excelData[i];
        const numero = row['numero'];
        const codigo = row['codigo_proyecto'] || row['codigo'] || 'N/A';

        console.log(`Excel Row ${i} -> Numero: ${numero}, Codigo: ${codigo}`);

        // Try to find in DB by ID = Numero
        if (numero) {
            const { data: dbRow } = await supabase
                .from('proyectos_servicios')
                .select('id, codigo_proyecto')
                .eq('id', numero)
                .single();

            if (dbRow) {
                console.log(`   DB match for ID ${numero}: Codigo=${dbRow.codigo_proyecto} Match=${dbRow.codigo_proyecto == codigo}`);
            } else {
                console.log(`   DB match for ID ${numero}: NOT FOUND`);
            }
        }
    }
}

verifyMapping();
