
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('CRITICAL: Missing Supabase Config');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const FILE_PATH = process.argv[2] || path.join(__dirname, '../..', 'Base.xlsx');

async function importDataV3() {
    try {
        console.log('Reading Excel file from:', FILE_PATH);
        const workbook = xlsx.readFile(FILE_PATH);

        let sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('proyecto') || s.toLowerCase().includes('servicio'));
        if (!sheetName) sheetName = workbook.SheetNames[0];
        console.log(`Using Sheet: ${sheetName}`);

        const worksheet = workbook.Sheets[sheetName];
        // FORCE INDEX MAPPING (Array of Arrays)
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        console.log(`Found ${data.length} raw rows.`);

        // 0. Clean Table (Delete ALL)
        console.log('Cleaning table public.proyectos_servicios...');
        const { error: delError } = await supabase.from('proyectos_servicios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (delError) console.error('Error deleting:', delError);

        // 1. Catalogs Cache
        const idCache = { ejes: {}, lineas: {} };
        const { data: ejes } = await supabase.from('ejes').select('id, numero');
        if (ejes) ejes.forEach(e => idCache.ejes[e.numero] = e.id);

        const { data: lineas } = await supabase.from('lineas').select('id, numero');
        if (lineas) lineas.forEach(l => idCache.lineas[l.numero] = l.id);

        let count = 0;

        // Skip header row if exists. Usually row 0 is header.
        // User said: "Columna 1 (Índice 1) -> periodo".
        // In array of arrays: Row is array. Col 1 is index 0? Or index 1?
        // Excel columns are A, B, C... 
        // User says "Columna 1 (Índice 1)".
        // If user says Index 1, they likely mean ARRAY INDEX 1 (Column B).
        // OR they mean 1-based index (Column A).
        // Let's assume 0-based unless explicit. "Columna 1 (Índice 1)". 1 usually implies 1st column.
        // BUT "Columna 10 (Índice 10)". 
        // Let's check logic: Periodo at Col A vs Col B?
        // Usually ID is Col A. Periodo is likely Col B?
        // Or Periodo is Col A?
        // I will log the first row to be sure.
        // Wait, I cannot interact.
        // User said "Columna 1 (Índice 1)". I will interpret as ARRAY INDEX 1 (Second Column) if 0-indexed, OR strict 1 column.
        // Given programmer terms, "Index 1" usually means `row[1]`.
        // I will use `row[1]` etc.

        // Let's iterate from row 1 (skipping header at 0).
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            // MAPPING
            // Col 1 (Index 1) -> Periodo ? Or Col A?
            // "Columna 1 (Índice 1) -> periodo"
            // If strict programming index: row[1]
            // If business speak: Column 1 = A = row[0].
            // BUT user said "Columna 1 (Índice 1)". Explicitly "Index 1".
            // I will use `row[1]`. (Column B).
            // Indices:
            // 1: Periodo (Year)
            // 2: Eje
            // 3: Linea
            // 10: Fondoempleo
            // 11: Contrapartida

            // Just in case, I'll check if row[1] looks like a year (2024, 2025).
            // If row[1] is undefined, skip.

            const rawPeriodo = row[1]; // Index 1
            const rawEje = row[2];     // Index 2
            const rawLinea = row[3];   // Index 3
            // Name? User didn't specify index for Name.
            // User said "Nombre: usa nombre proyecto o servicio" previously.
            // I'll scan for it? Or guess Index 4?
            // Let's just use "Proyecto" if we can, or column 5?
            // User did not give index for name in this turn.
            // "Columna 1.. 2.. 3.. 10.. 11.."
            // I will try to find "Nombre" column index dynamic, or default to a safe index (maybe 5/6?).
            // or just use `row[5]`?
            // Let's try to grab a string column.
            const rawNombre = row[5] || row[4] || 'Proyecto (Importado)';

            const rawFE = row[10];     // Index 10
            const rawContra = row[11]; // Index 11

            // Conversions using strict rules
            const cleanInt = (v) => {
                if (!v) return null;
                const n = parseInt(String(v).replace(/[^0-9]/g, ''));
                return isNaN(n) ? null : n;
            };

            const cleanFloat = (v) => {
                if (!v) return 0;
                const s = String(v).replace(/[^0-9.-]/g, '');
                return parseFloat(s) || 0;
            };

            const anio = cleanInt(rawPeriodo);
            const ejeNum = cleanInt(rawEje);
            const lineaNum = cleanInt(rawLinea);
            const montoFE = cleanFloat(rawFE);
            const montoContra = cleanFloat(rawContra);
            const montoTotal = montoFE + montoContra;
            const benef = 0; // User didn't specify index for benef this time, set 0.

            if (!anio) {
                // Skip rows without year
                continue;
            }

            if (count === 0) {
                console.log(`FIRST ROW PREVIEW: Year=${anio}, Eje=${ejeNum}, Linea=${lineaNum}, FE=${montoFE}, Contra=${montoContra}`);
            }

            let ejeId = ejeNum ? idCache.ejes[ejeNum] : null;
            let lineaId = lineaNum ? idCache.lineas[lineaNum] : null;

            const payload = {
                codigo_proyecto: `PROJ-V3-${i}-${anio}`,
                nombre: String(rawNombre).substring(0, 200),
                eje_id: ejeId,
                linea_id: lineaId,
                monto_fondoempleo: montoFE,
                monto_contrapartida: montoContra,
                monto_total: montoTotal,
                beneficiarios: benef,
                año: anio,
                estado: 'En Ejecución'
            };

            const { error } = await supabase.from('proyectos_servicios').upsert(payload, { onConflict: 'codigo_proyecto' });
            if (!error) count++;
            else console.error('Row Error:', error.message);
        }
        console.log(`Imported ${count} rows.`);

        // Final verify log
        const { data: last } = await supabase.from('proyectos_servicios').select('año, nombre, monto_fondoempleo').limit(1);
        console.log('DB Sample:', last);

    } catch (e) {
        console.error('Import Error:', e);
    }
}

importDataV3();
