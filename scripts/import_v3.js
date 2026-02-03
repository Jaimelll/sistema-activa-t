
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

        // Limpieza Previa: Ejecuta el TRUNCATE -> Using delete() as proxy
        console.log('Cleaning table public.proyectos_servicios...');
        const { error: delError } = await supabase.from('proyectos_servicios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (delError) console.error('Error deleting:', delError);

        // Cache for relations (Indices 2 and 3)
        const idCache = { ejes: {}, lineas: {} };
        const { data: ejes } = await supabase.from('ejes').select('id, numero');
        if (ejes) ejes.forEach(e => idCache.ejes[e.numero] = e.id);
        const { data: lineas } = await supabase.from('lineas').select('id, numero');
        if (lineas) lineas.forEach(l => idCache.lineas[l.numero] = l.id);

        let count = 0;

        // Iterate starting from row 1 (skipping header)
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            // USER PROVIDED EXACT LOGIC
            const v_año = parseInt(row[1]); // Columna 'periodo' (Index 1)
            const v_beneficiarios = parseInt(row[9]) || 0;

            // Clean floats
            const v_fondo = parseFloat(String(row[10]).replace(/[^0-9.-]+/g, '')) || 0;
            const v_contra = parseFloat(String(row[11]).replace(/[^0-9.-]+/g, '')) || 0;

            const v_nombre = row[4]; // nombre proyecto o servicio (Assuming Index 4 based on previous logs context)

            // Relation IDs
            const v_eje = parseInt(row[2]);
            const v_linea = parseInt(row[3]);

            // Debug Obligatorio
            if (count < 5 || v_fondo > 1000000) {
                console.log('Insertando:', v_año, v_fondo, `(Contra: ${v_contra})`);
            }

            // Validar
            if (!v_año) continue;

            const payload = {
                codigo_proyecto: `PROJ-USER-${i}-${v_año}`,
                año: v_año,
                beneficiarios: v_beneficiarios,
                monto_fondoempleo: v_fondo,
                monto_contrapartida: v_contra,
                monto_total: v_fondo + v_contra,
                nombre: v_nombre ? String(v_nombre).substring(0, 200) : `Proyecto ${i}`,
                // Foreign Keys
                eje_id: v_eje ? idCache.ejes[v_eje] : null,
                linea_id: v_linea ? idCache.lineas[v_linea] : null,
                estado: 'En Ejecución'
            };

            const { error } = await supabase.from('proyectos_servicios').upsert(payload, { onConflict: 'codigo_proyecto' });
            if (!error) {
                count++;
            } else {
                console.error(`Error Row ${i}:`, error.message);
            }
        }
        console.log(`Imported ${count} rows.`);

        // Final Verify
        const { data: verif } = await supabase.from('proyectos_servicios')
            .select('año, monto_fondoempleo')
            .gt('monto_fondoempleo', 0)
            .limit(3);
        console.log('DB Verify (>0):', verif);

    } catch (e) {
        console.error('Import Error:', e);
    }
}

importDataV3();
