
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// Fix: ensure we use the service role key for admin access (bypassing RLS)
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('CRITICAL: Missing Supabase Config (URL or SERVICE_ROLE_KEY)');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const FILE_PATH = process.argv[2] || path.join(__dirname, '../..', 'Base.xlsx');

async function importDataV3() {
    try {
        console.log('Reading Excel file from:', FILE_PATH);
        const workbook = xlsx.readFile(FILE_PATH);

        // Find the correct sheet
        let sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('proyecto') || s.toLowerCase().includes('servicio'));
        if (!sheetName) {
            console.log('Sheet checking:', workbook.SheetNames);
            sheetName = workbook.SheetNames[0]; // Fallback
        }
        console.log(`Using Sheet: ${sheetName}`);

        const worksheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(worksheet, { defval: null });
        console.log(`Found ${rows.length} rows.`);

        // 0. Clean Table
        console.log('Cleaning table public.proyectos_servicios...');
        const { error: delError } = await supabase.from('proyectos_servicios').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        if (delError) console.error('Error deleting:', delError);

        // 1. Catalogs Cache (We need IDs for Eje/Linea)
        // Schema: Ejes(id, numero), Lineas(id, numero) using the 'numero' column for matching
        const idCache = { ejes: {}, lineas: {} };

        // Pre-fetch catalogs
        const { data: ejes } = await supabase.from('ejes').select('id, numero');
        if (ejes) ejes.forEach(e => idCache.ejes[e.numero] = e.id);

        const { data: lineas } = await supabase.from('lineas').select('id, numero');
        if (lineas) lineas.forEach(l => idCache.lineas[l.numero] = l.id);

        console.log('Cache loaded. Ejes:', Object.keys(idCache.ejes).length, 'Lineas:', Object.keys(idCache.lineas).length);

        let count = 0;
        for (const row of rows) {
            // Strict Column Mapping
            // Keys: 'periodo', 'eje', 'línea', 'nombre proyecto o servicio', 'fondoempleo ', 'contrapartida ', 'cantidad de beneficiarios'

            // Helper to clean keys (trim)
            const getVal = (key) => {
                // Try exact match first
                if (row[key] !== undefined) return row[key];
                // Try trimmed match
                const foundKey = Object.keys(row).find(k => k.trim().toLowerCase() === key.trim().toLowerCase());
                return foundKey ? row[foundKey] : undefined;
            };

            const periodoRaw = getVal('periodo') || getVal('año');
            const ejeRaw = getVal('eje');
            const lineaRaw = getVal('línea') || getVal('linea'); // Try with and without accent
            const nombreRaw = getVal('nombre proyecto o servicio') || getVal('proyecto');
            const montoFERaw = getVal('fondoempleo') || getVal('fondoempleo '); // try with space
            const montoContraRaw = getVal('contrapartida') || getVal('contrapartida ');
            const benefRaw = getVal('cantidad de beneficiarios') || getVal('beneficiarios');

            // Sanitize & Convert
            const anio = periodoRaw ? parseInt(String(periodoRaw).trim()) : 2024;
            const ejeNum = ejeRaw ? parseInt(String(ejeRaw).trim()) : null;
            const lineaNum = lineaRaw ? parseInt(String(lineaRaw).trim()) : null;

            // Clean Money (remove commas, spaces, S/.)
            const cleanMoney = (val) => {
                if (!val) return 0;
                const s = String(val).replace(/[^0-9.-]/g, '');
                return parseFloat(s) || 0;
            };

            const montoFE = cleanMoney(montoFERaw);
            const montoContra = cleanMoney(montoContraRaw);
            const montoTotal = montoFE + montoContra;

            const benef = benefRaw ? parseInt(String(benefRaw).replace(/[^0-9]/g, '')) : 0;

            // Relations
            // If Eje 1 exists in DB as number 1, we get its ID.
            let ejeId = ejeNum ? idCache.ejes[ejeNum] : null;
            let lineaId = lineaNum ? idCache.lineas[lineaNum] : null;

            // If relation missing in cache, maybe valid?
            // User said: "Usa los números... para las relaciones". 
            // This implies the values in CSV are just indices like 1, 2.

            const payload = {
                codigo_proyecto: `PROJ-${count + 1}-${anio}`, // Generate if missing
                nombre: nombreRaw || 'Sin Nombre',
                eje_id: ejeId,
                linea_id: lineaId,
                monto_fondoempleo: montoFE,
                monto_contrapartida: montoContra,
                monto_total: montoTotal,
                beneficiarios: benef,
                año: anio, // The critical column for filtering
                estado: 'En Ejecución' // Default
            };

            const { error } = await supabase.from('proyectos_servicios').upsert(payload, { onConflict: 'codigo_proyecto' });
            if (!error) {
                count++;
            } else {
                console.error('Error row:', payload.codigo_proyecto, error.message);
            }
        }
        console.log(`Imported ${count} records successfully.`);

        // Verification Log
        const { data: verif } = await supabase.from('proyectos_servicios').select('año, monto_fondoempleo').limit(3);
        console.log('Verification Sample:', verif);

    } catch (e) {
        console.error('Import Error:', e);
    }
}

importDataV3();
