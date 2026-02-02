
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
const FILE_PATH = process.argv[2] || path.join(__dirname, '../..', 'Base.xlsx');

async function importData() {
    try {
        console.log('Reading Excel file from:', FILE_PATH);
        const workbook = xlsx.readFile(FILE_PATH);

        // 1. Catalogs Map
        const catalogs = {
            'eje': 'ejes',
            'linea': 'lineas',
            'región': 'regiones',
            'etapa': 'etapas'
        };

        const mapIds = {
            ejes: {},
            lineas: {},
            regiones: {},
        };

        for (const [sheetName, tableName] of Object.entries(catalogs)) {
            if (workbook.SheetNames.includes(sheetName)) {
                console.log(`Importing ${sheetName} to ${tableName}...`);
                const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

                for (const row of rows) {
                    const payload = {};
                    if (row['Numero'] !== undefined) payload.numero = row['Numero'];
                    if (row['descripcion'] !== undefined) payload.descripcion = row['descripcion'];
                    if (row['fase'] !== undefined) payload.fase = row['fase'];

                    if (!payload.descripcion) continue;

                    const { data, error } = await supabase
                        .from(tableName)
                        .upsert(payload, { onConflict: 'descripcion' })
                        .select('id, descripcion')
                        .single();

                    if (error) {
                        console.error(`Error upserting ${tableName}:`, row, error.message);
                    } else if (mapIds[tableName]) {
                        mapIds[tableName][payload.descripcion] = data.id;
                    }
                }
            }
        }

        // 2. Instituciones & Proyectos
        if (workbook.SheetNames.includes('detalle')) {
            console.log('Importing detalle to proyectos_servicios...');
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets['detalle']);
            const instMap = {};

            console.log(`Found ${rows.length} projects.`);

            for (const row of rows) {
                // Ensure Institution exists
                const instName = row['INSTITUCION_EJECUTORA'];
                let instId = null;

                if (instName) {
                    if (instMap[instName]) {
                        instId = instMap[instName];
                    } else {
                        // Check DB
                        const { data: exist } = await supabase.from('instituciones_ejecutoras').select('id').eq('nombre', instName).single();
                        if (exist) {
                            instId = exist.id;
                        } else {
                            const { data: newInst, error: iErr } = await supabase.from('instituciones_ejecutoras').insert({ nombre: instName }).select('id').single();
                            if (iErr) console.error('Error creating inst:', instName, iErr.message);
                            else instId = newInst.id;
                        }
                        if (instId) instMap[instName] = instId;
                    }
                }

                // Resolve FKs
                const ejeDesc = row['EJE_INTERVENCION'];
                const lineaDesc = row['LINEA_INTERVENCION'];
                const regionDesc = row['REGION'];

                // Helper to get ID
                const getId = async (table, desc) => {
                    if (!desc) return null;
                    if (mapIds[table] && mapIds[table][desc]) return mapIds[table][desc];
                    // Fallback query
                    const { data } = await supabase.from(table).select('id').eq('descripcion', desc).single();
                    return data ? data.id : null;
                };

                const ejeId = await getId('ejes', ejeDesc);
                const lineaId = await getId('lineas', lineaDesc);
                const regionId = await getId('regiones', regionDesc);

                const projectPayload = {
                    codigo_proyecto: row['CODIGO_PROYECTO'],
                    nombre: row['PROYECTO'],
                    linea_id: lineaId,
                    eje_id: ejeId,
                    region_id: regionId,
                    institucion_ejecutora_id: instId,
                    monto_fondoempleo: row['MONTO_FONDOEMPLEO'] || 0,
                    monto_contrapartida: row['MONTO_CONTRAPARTIDA'] || 0,
                    monto_total: row['MONTO_TOTAL'] || 0,
                    estado: row['ESTADO'],
                    beneficiarios: row['BENEFICIARIOS'] || 0
                };

                // Date parsing (Excel often uses serial numbers or strings)
                // Assuming string or serial. Simple fix logic:
                // If using 'xlsx', it can handle dates if 'cellDates: true' used in readFile, OR parsing manual.
                // sheet_to_json defaults to raw values unless options.
                // We'll leave date parsing as is or minimal check.

                const { error: pErr } = await supabase
                    .from('proyectos_servicios')
                    .upsert(projectPayload, { onConflict: 'codigo_proyecto' });

                if (pErr) console.error('Error inserting project:', row['CODIGO_PROYECTO'], pErr.message);
            }
        }

        console.log('Import completed.');

    } catch (e) {
        console.error('Import Error:', e);
        process.exit(1);
    }
}

importData();
