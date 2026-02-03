
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
// Accept file path from args or default to /app/Base.xlsx (Docker path)
const FILE_PATH = process.argv[2] || '/app/Base.xlsx';

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
        // Using DELETE because we don't have direct SQL access for TRUNCATE, and IDs are UUIDs so Identity reset is not needed.
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

        // Skip header (row 0)
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            // STRICT INDICES MAPPING (0-based)
            // User provided:
            // Index 1 -> Periodo (Año)
            // Index 9 -> Beneficiarios
            // Index 10 -> Fondoempleo
            // Index 11 -> Contrapartida
            // Index 2 -> Eje (Assuming from previous context, user didn't explicitly change this but likely valid)
            // Index 3 -> Linea (Assuming from previous context)
            // Index 5? -> Nombre (Guessing/Scanning, or using safe fallback)

            const rawPeriodo = row[1];
            const rawEje = row[2];
            const rawLinea = row[3];
            const rawNombre = row[4] || row[5] || 'Proyecto Importado';

            const rawBenef = row[9];
            const rawFE = row[10];
            const rawContra = row[11];

            // Conversions
            const cleanInt = (v) => {
                if (v === null || v === undefined) return null;
                const s = String(v).replace(/[^0-9]/g, '');
                return s ? parseInt(s) : 0;
            };

            const cleanFloat = (v) => {
                if (v === null || v === undefined) return 0;
                const s = String(v).replace(/[^0-9.-]/g, ''); // Keep dots and minus
                return s ? parseFloat(s) : 0;
            };

            const anio = cleanInt(rawPeriodo);
            const ejeNum = cleanInt(rawEje);
            const lineaNum = cleanInt(rawLinea);

            const benef = cleanInt(rawBenef); // Ensure integer for beneficiaries
            const montoFE = cleanFloat(rawFE);
            const montoContra = cleanFloat(rawContra);
            const montoTotal = montoFE + montoContra;

            if (!anio) continue; // Skip if no year

            if (count === 0) {
                console.log(`FIRST ROW DEBUG: Year=${anio}, Benef=${benef}, FE=${montoFE}, Contra=${montoContra}, Total=${montoTotal}`);
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
        const { data: last } = await supabase.from('proyectos_servicios')
            .select('año, monto_fondoempleo, monto_contrapartida, monto_total')
            .order('monto_fondoempleo', { ascending: false })
            .limit(1);
        console.log('Highest Funding Sample:', last);

    } catch (e) {
        console.error('Import Error:', e);
    }
}

importDataV3();
