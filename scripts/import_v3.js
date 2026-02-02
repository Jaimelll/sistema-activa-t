
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase Config');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const FILE_PATH = process.argv[2] || path.join(__dirname, '../..', 'Base.xlsx');

async function importDataV3() {
    try {
        console.log('Reading Excel file from:', FILE_PATH);
        const workbook = xlsx.readFile(FILE_PATH);

        // 1. Catalogs
        const catalogMap = {
            'eje': 'ejes',
            'linea': 'lineas',
            'región': 'regiones',
            'etapa': 'etapas',
            'modalidad': 'modalidades'
        };

        // Cache: Table -> Key (Numero or Desc depends) -> ID
        const idCache = {};

        for (const [sheet, table] of Object.entries(catalogMap)) {
            if (!workbook.SheetNames.includes(sheet)) continue;
            console.log(`Importing ${sheet} -> ${table}...`);
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheet]);
            idCache[table] = {};

            for (const row of rows) {
                const payload = {};
                if (row['Numero'] !== undefined) payload.numero = row['Numero'];
                if (row['descripcion'] !== undefined) payload.descripcion = row['descripcion'];
                // Ensure unique constraint satisfaction on upsert
                // If table has unique 'numero', use that? Or 'descripcion'? 
                // V3 schema defines 'numero' as unique for Ejes/Lineas. 
                // Let's rely on 'descripcion' for text-based ones, but 'numero' for Eje/Linea.

                let uniqueKey = 'descripcion'; // Default
                if (['ejes', 'lineas'].includes(table) && payload.numero) uniqueKey = 'numero';

                const { data, error } = await supabase
                    .from(table)
                    .upsert(payload, { onConflict: uniqueKey })
                    .select('id, numero, descripcion')
                    .single(); // .maybeSingle() if risk of dupe return?

                if (!error && data) {
                    if (['ejes', 'lineas'].includes(table)) {
                        // Cache by number
                        if (data.numero) idCache[table][data.numero] = data.id;
                    } else {
                        // Cache by description
                        if (data.descripcion) idCache[table][data.descripcion.trim().toLowerCase()] = data.id;
                    }
                }
            }
        }

        // 2. Import Detalle
        if (workbook.SheetNames.includes('detalle')) {
            console.log('Importing detalle (V3 Numeric Logic)...');
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets['detalle']);
            console.log(`Found ${rows.length} rows.`);

            let count = 0;
            for (const row of rows) {
                // Institucion
                const instName = row['INSTITUCION_EJECUTORA'];
                let instId = null;
                if (instName) {
                    const { data: iData } = await supabase.from('instituciones_ejecutoras').upsert({ nombre: instName }, { onConflict: 'nombre' }).select('id').single();
                    if (iData) instId = iData.id;
                }

                // Resolve numeric FKs
                const ejeNum = row['EJE_INTERVENCION'] || row['eje'];
                const lineaNum = row['LINEA_INTERVENCION'] || row['linea'];
                // If excel uses "1" for eje, map using cache
                const ejeId = idCache['ejes']?.[ejeNum] || null;
                const lineaId = idCache['lineas']?.[lineaNum] || null;

                // Text FKs
                const regName = row['REGION'];
                const regionId = regName ? (idCache['regiones']?.[String(regName).trim().toLowerCase()] || null) : null;

                // Periodo/Año - Accept 'PERIODO' or 'AÑO'
                let anio = row['AÑO'] || row['PERIODO'] || row['año'] || 2024;
                if (typeof anio === 'string') anio = parseInt(anio);

                const payload = {
                    codigo_proyecto: row['CODIGO_PROYECTO'],
                    nombre: row['PROYECTO'],
                    eje_id: ejeId,
                    linea_id: lineaId,
                    region_id: regionId,
                    institucion_ejecutora_id: instId,
                    monto_fondoempleo: row['MONTO_FONDOEMPLEO'] || 0,
                    monto_contrapartida: row['MONTO_CONTRAPARTIDA'] || 0,
                    monto_total: row['MONTO_TOTAL'] || 0,
                    beneficiarios: row['BENEFICIARIOS'] || 0,
                    estado: row['ESTADO'],
                    año: anio
                };

                const { error } = await supabase.from('proyectos_servicios').upsert(payload, { onConflict: 'codigo_proyecto' });
                if (!error) count++;
                else console.log('Error row:', row['CODIGO_PROYECTO'], error.message);
            }
            console.log(`Imported ${count} records.`);
        }

    } catch (e) {
        console.error('Import V3 Error:', e);
    }
}

importDataV3();
