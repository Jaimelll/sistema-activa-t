const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const excelPath = 'c:\\trabajo\\fondo\\avance_beca.xlsx';

async function migrateAvance() {
    console.log('--- Iniciando Migración (Unpivot) de Avances ---');

    // 1. Cargar Excel
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    // 2. Cargar Catálogo de Etapas
    console.log('Caching Etapas...');
    const { data: etapas } = await supabase.from('etapas').select('id, descripcion');
    const etapaMap = Object.fromEntries((etapas || []).map(e => [e.descripcion.toLowerCase(), e.id]));
    let maxEtapaId = Math.max(0, ...(etapas || []).map(e => e.id));

    // Columnas de hitos en el Excel
    const milestoneCols = [
        'Aprobación de bases',
        'Lanzamiento',
        'Aprobación de consejo',
        'En ejecución',
        'ejecutado'
    ];

    const records = [];
    const batchSize = 100;

    console.log('Phase 1: Processing rows and unpivoting...');
    
    for (const row of data) {
        const becaId = row['id'];
        if (!becaId) continue;

        for (const col of milestoneCols) {
            let dateVal = row[col];
            if (!dateVal) continue;

            // Excel dates are numbers (days since 1900)
            if (typeof dateVal === 'number') {
                const date = XLSX.SSF.parse_date_code(dateVal);
                dateVal = `${date.y}-${date.m.toString().padStart(2, '0')}-${date.d.toString().padStart(2, '0')}`;
            }

            // Ensure stage exists
            const stageName = col;
            let etapaId = etapaMap[stageName.toLowerCase()];
            if (!etapaId) {
                console.log(`Creating missing stage: "${stageName}"`);
                const { data: newStage, error } = await supabase
                    .from('etapas')
                    .insert({ id: ++maxEtapaId, descripcion: stageName })
                    .select()
                    .single();
                
                if (error) {
                    console.error(`Error creating stage ${stageName}:`, error.message);
                    continue;
                }
                etapaId = newStage.id;
                etapaMap[stageName.toLowerCase()] = etapaId;
            }

            records.push({
                beca_id: becaId,
                etapa_id: etapaId,
                fecha: dateVal,
                sustento: 'Carga inicial de hitos históricos'
            });

            // Insert in batches
            if (records.length >= batchSize) {
                await insertBatch(records);
                records.length = 0;
            }
        }
    }

    // Insert remaining
    if (records.length > 0) {
        await insertBatch(records);
    }

    console.log('--- Migración de Avances Finalizada ---');
}

async function insertBatch(batch) {
    console.log(`Insertando lote de ${batch.length} avances...`);
    const { error } = await supabase.from('avance_beca').insert(batch);
    if (error) {
        console.error('Error insertando lote:', error.message);
    }
}

migrateAvance().catch(console.error);
