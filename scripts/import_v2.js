
const xlsx = require('xlsx');
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
// Use arg or default
const FILE_PATH = process.argv[2] || path.join(__dirname, '../..', 'Base.xlsx');

async function importDataV2() {
    try {
        console.log('Reading Excel file from:', FILE_PATH);
        const workbook = xlsx.readFile(FILE_PATH);

        // 1. Import Catalogs
        const catalogMap = {
            'eje': 'ejes',
            'linea': 'lineas',
            'región': 'regiones',
            'etapa': 'etapas',
            'modalidad': 'modalidades',
            'beneficiarios': 'beneficiarios_tipos',
            'modalidad de ejecución': 'modalidades_ejecucion'
        };

        const idCache = {}; // table -> description -> id

        for (const [sheet, table] of Object.entries(catalogMap)) {
            if (!workbook.SheetNames.includes(sheet)) {
                console.warn(`Sheet '${sheet}' not found. Skipping table '${table}'.`);
                continue;
            }

            console.log(`Importing ${sheet} -> ${table}...`);
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheet]);
            idCache[table] = {};

            for (const row of rows) {
                const payload = {};
                // Normalize keys (case insensitive check usually helps but sheet_to_json gives strict keys)
                // Observed keys: Numero, descripcion, fase
                if (row['Numero'] !== undefined) payload.numero = row['Numero'];
                if (row['descripcion'] !== undefined) payload.descripcion = row['descripcion'];
                if (row['fase'] !== undefined) payload.fase = row['fase'];

                if (!payload.descripcion) continue;

                const { data, error } = await supabase
                    .from(table)
                    .upsert(payload, { onConflict: 'descripcion' })
                    .select('id, descripcion')
                    .single();

                if (error) {
                    console.error(`Error upserting ${table}:`, error.message);
                } else {
                    idCache[table][data.descripcion] = data.id;
                    // Also populate lowercase/trimmed key for easier matching later
                    idCache[table][data.descripcion.trim().toLowerCase()] = data.id;
                }
            }
        }

        // 2. Import Master Data (Instituciones & Proyectos)
        if (workbook.SheetNames.includes('detalle')) {
            console.log('Importing detalle -> proyectos_servicios...');
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets['detalle']);

            console.log(`Found ${rows.length} rows in detalle.`);

            let count = 0;
            for (const row of rows) {
                // Institucion Upsert
                const instName = row['INSTITUCION_EJECUTORA'];
                let instId = null;

                if (instName) {
                    // Cache check?
                    // We'll just upsert for safety or check first. Upsert on name unique is safest.
                    const { data: instData, error: instErr } = await supabase
                        .from('instituciones_ejecutoras')
                        .upsert({ nombre: instName }, { onConflict: 'nombre' })
                        .select('id')
                        .single();

                    if (instErr) console.error('Error inst:', instErr.message);
                    else instId = instData.id;
                }

                // FK Resolution
                const resolveId = (table, value) => {
                    if (!value) return null;
                    const clean = String(value).trim().toLowerCase();
                    return idCache[table]?.[clean] || null;
                };

                const lineaId = resolveId('lineas', row['LINEA_INTERVENCION']);
                const ejeId = resolveId('ejes', row['EJE_INTERVENCION']);
                const regionId = resolveId('regiones', row['REGION']);
                const etapaId = resolveId('etapas', row['ETAPA']);
                const modId = resolveId('modalidades', row['MODALIDAD__']); // Check exact header in debug if needed, guessing 'MODALIDAD'
                // Actually 'MODALIDAD_DE_EJECUCION' might be a separate column
                // Let's rely on standard column names found in 'detalle'. 
                // Based on previous inspections, we might need to be flexible.
                // Assuming standard headers match:
                // LINEA_INTERVENCION, EJE_INTERVENCION, REGION, ETAPA, ...

                // Helper for unknown cols:
                // const headers = Object.keys(row); // DEBUG if needed

                // Beneficiario: 'TIPO_BENEFICIARIO' maybe? Or just mapped from text.
                // If mapping fails, it stays null, which is fine for V1.

                const payload = {
                    codigo_proyecto: row['CODIGO_PROYECTO'],
                    nombre: row['PROYECTO'],
                    linea_id: lineaId,
                    eje_id: ejeId,
                    region_id: regionId,
                    etapa_id: etapaId,
                    // modalidad_id: ...
                    institucion_ejecutora_id: instId,
                    monto_fondoempleo: row['MONTO_FONDOEMPLEO'] || 0,
                    monto_contrapartida: row['MONTO_CONTRAPARTIDA'] || 0,
                    monto_total: row['MONTO_TOTAL'] || 0,
                    beneficiarios: row['BENEFICIARIOS'] || 0,
                    estado: row['ESTADO'],
                    año: row['AÑO'] || 2024
                };

                const { error: pErr } = await supabase
                    .from('proyectos_servicios')
                    .upsert(payload, { onConflict: 'codigo_proyecto' });

                if (pErr) {
                    console.error('Error project:', row['CODIGO_PROYECTO'], pErr.message);
                } else {
                    count++;
                }

                if (count % 50 === 0) process.stdout.write('.');
            }
            console.log(`\nImported ${count} projects.`);
        }

    } catch (e) {
        console.error('Import V2 Error:', e);
    }
}

importDataV2();
