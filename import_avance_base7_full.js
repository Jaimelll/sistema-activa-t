
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Faltan credenciales de Supabase en .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importAvances() {
    try {
        console.log('--- Iniciando Importación de Avance Proyecto (6 Etapas) ---');

        // 0. Truncate Table (Explicitly)
        console.log('Truncando tabla avance_proyecto...');
        const { error: truncError } = await supabase.rpc('truncate_avance_proyecto');
        if (truncError) {
            // Fallback if RPC doesn't exist: Delete all rows
            console.warn('RPC truncate failed, trying delete all...', truncError.message);
            const { error: delError } = await supabase.from('avance_proyecto').delete().neq('id', 0);
            if (delError) throw delError;
        }
        console.log('Tabla truncada/limpiada.');

        // 1. Leer Excel
        const excelPath = path.resolve('..', 'Base7.xlsx'); // Adjusted path based on user context: c:/trabajo/fondo/Base7.xlsx relative to c:/trabajo/fondo/sistema-activa-t
        console.log(`Leyendo archivo: ${excelPath}`);
        const workbook = XLSX.readFile(excelPath);
        const sheetName = 'proyecto_servicio';
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
            throw new Error(`Hoja '${sheetName}' no encontrada.`);
        }

        const data = XLSX.utils.sheet_to_json(sheet);
        console.log(`Total filas en Excel: ${data.length}`);

        // 2. Validar IDs existentes en DB
        const { data: proyectos, error: projError } = await supabase
            .from('proyectos_servicios')
            .select('id');

        if (projError) throw projError;

        // Crear Set de IDs válidos
        const validIds = new Set(proyectos.map(p => p.id));
        console.log(`Total IDs en DB: ${validIds.size}`);

        // 3. Preparar Inserts
        const insertBatch = [];
        let skipped = 0;

        // Mapeo de Columnas -> Etapa ID
        const stageMapping = {
            'Aprobación de bases': 1,
            'Actos Previos': 2,
            'Aprobación de consejo': 3,
            'Firma convenio': 4,
            'En ejecución': 5,
            'ejecutado': 6
        };

        // Debug Row Keys
        if (data.length > 0) {
            console.log('First Row Keys:', Object.keys(data[0]));
            console.log('First Row Values:', data[0]);
        }

        // Initialize set to track unique projects with at least one valid stage
        const projectsWithData = new Set();

        for (const row of data) {
            // User Request: Use 'numero' from Excel as 'proyecto_id' directly.
            // Explicitly map 'numero' to 'id'.
            const proyectoIdRaw = row['numero'];

            if (!proyectoIdRaw) continue;

            const proyectoId = Number(proyectoIdRaw);

            if (!validIds.has(proyectoId)) {
                // console.warn(`ID no existe en DB: ${proyectoId}`);
                skipped++;
                continue;
            }

            let hasStageData = false;

            // Iterate over the 6 stages
            for (const [colName, etapaId] of Object.entries(stageMapping)) {
                let cellValue = row[colName];

                if (cellValue) {
                    let dateStr = null;

                    // Manejo de Fechas Excel
                    if (typeof cellValue === 'number') {
                        const date = XLSX.SSF.parse_date_code(cellValue);
                        // Padding for month/day
                        const y = date.y;
                        const m = String(date.m).padStart(2, '0');
                        const d = String(date.d).padStart(2, '0');
                        dateStr = `${y}-${m}-${d}`;
                    } else if (typeof cellValue === 'string') {
                        // Intentar parsear strings si vienen como texto
                        // Asumimos formato YYYY-MM-DD o similar si es string, pero Excel suele dar numeros
                        if (cellValue.trim().length > 0) dateStr = cellValue.trim();
                    }

                    if (dateStr) {
                        insertBatch.push({
                            proyecto_id: proyectoId,
                            etapa_id: etapaId,
                            fecha: dateStr
                        });
                        hasStageData = true;
                    }
                }
            }

            if (hasStageData) {
                projectsWithData.add(proyectoId);
            }
        }

        console.log(`Registros listos para insertar: ${insertBatch.length}`);
        console.log(`IDs omitidos (no en DB o sin numero): ${skipped}`);
        console.log(`Proyectos ÚNICOS con data procesados: ${projectsWithData.size}`);

        // Verificación de ID 323
        if (projectsWithData.has(323)) {
            console.log('VICTORY: Proyecto ID 323 procesado correctamente.');
        } else {
            console.error('WARNING: Proyecto ID 323 NO fue procesado.');
        }

        // 4. Insertar en Lotes
        const BATCH_SIZE = 100;
        let insertedCount = 0;
        for (let i = 0; i < insertBatch.length; i += BATCH_SIZE) {
            const batch = insertBatch.slice(i, i + BATCH_SIZE);
            const { error: insertError } = await supabase
                .from('avance_proyecto')
                .insert(batch);

            if (insertError) {
                console.error(`Error insertando lote ${i}:`, insertError);
            } else {
                insertedCount += batch.length;
                process.stdout.write('.');
            }
        }
        console.log(`\nImportación completada. Total registros insertados: ${insertedCount}`);


    } catch (err) {
        console.error('Error Fatal:', err);
    }
}

importAvances();
