
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
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null, blankrows: false });
        console.log(`Found ${data.length} raw rows.`);

        if (data.length > 0) {
            console.log('--- ROW 0 (Header?) ---');
            console.log(JSON.stringify(data[0]));
            if (data.length > 1) {
                console.log('--- ROW 1 (Data Sample) ---');
                console.log(JSON.stringify(data[1]));
            }
        }

        console.log('Cleaning table public.proyectos_servicios...');
        const { error: delError } = await supabase.from('proyectos_servicios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (delError) console.error('Error deleting:', delError);

        // Cache
        const idCache = { ejes: {}, lineas: {} };
        const { data: ejes } = await supabase.from('ejes').select('id, numero');
        if (ejes) ejes.forEach(e => idCache.ejes[e.numero] = e.id);
        const { data: lineas } = await supabase.from('lineas').select('id, numero');
        if (lineas) lineas.forEach(l => idCache.lineas[l.numero] = l.id);

        let count = 0;

        // Iterate starting from row 1 (assuming row 0 is header)
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            // Strict Indices (Base 0)
            // 1: Periodo (Año)
            // 2: Eje (Assuming)
            // 3: Linea (Assuming)
            // 9: Beneficiarios
            // 10: Fondoempleo
            // 11: Contrapartida

            const rawPeriodo = row[1];
            const rawEje = row[2];
            const rawLinea = row[3];
            const rawNombre = row[4]; // Guessing name is earlier.

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
                const s = String(v).replace(/[^0-9.-]/g, '');
                return s ? parseFloat(s) : 0;
            };

            const anio = cleanInt(rawPeriodo);
            const ejeNum = cleanInt(rawEje);
            const lineaNum = cleanInt(rawLinea);
            const benef = cleanInt(rawBenef);

            const montoFE = cleanFloat(rawFE);
            const montoContra = cleanFloat(rawContra);
            const montoTotal = montoFE + montoContra;

            // Debug first valid row
            if (count === 0 && anio) {
                console.log(`DEBUG MAPPING ROW ${i}:`);
                console.log(`Periodo (Idx 1): ${rawPeriodo} -> ${anio}`);
                console.log(`Benef (Idx 9): ${rawBenef} -> ${benef}`);
                console.log(`FE (Idx 10): ${rawFE} -> ${montoFE}`);
                console.log(`Contra (Idx 11): ${rawContra} -> ${montoContra}`);
            }

            if (!anio) continue;

            const payload = {
                codigo_proyecto: `PROJ-S-${i}-${anio}`,
                nombre: rawNombre ? String(rawNombre).substring(0, 200) : `Proyecto ${i}`,
                eje_id: ejeNum ? idCache.ejes[ejeNum] : null,
                linea_id: lineaNum ? idCache.lineas[lineaNum] : null,
                monto_fondoempleo: montoFE,
                monto_contrapartida: montoContra,
                monto_total: montoTotal,
                beneficiarios: benef,
                año: anio,
                estado: 'En Ejecución'
            };

            const { error } = await supabase.from('proyectos_servicios').upsert(payload, { onConflict: 'codigo_proyecto' });
            if (!error) count++;
            else console.error(`Error Row ${i}:`, error.message);
        }
        console.log(`Imported ${count} rows.`);

        const { data: check } = await supabase.from('proyectos_servicios').select('año, monto_fondoempleo').gt('monto_fondoempleo', 0).limit(3);
        console.log('Check > 0:', check);

    } catch (e) {
        console.error('Import Error:', e);
    }
}

importDataV3();
