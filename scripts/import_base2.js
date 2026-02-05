
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
const FILE_PATH = path.join(__dirname, '..', 'Base2.xlsx');

// Normalization Helper: Lowercase + Remove Accents (Strict as requested)
const normalize = (str) => {
    if (!str) return '';
    return String(str)
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

async function importData() {
    try {
        console.log('--- START IMPORT BASE2 (STRICT MODE) ---');
        console.log('File:', FILE_PATH);

        const workbook = xlsx.readFile(FILE_PATH);

        // 1. CLEAN
        console.log('Step 1: Cleaning Projects and Regions...');
        await supabase.from('proyectos_servicios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('regiones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        console.log('Tables cleaned.');

        const lookups = { regiones: {}, etapas: {}, lineas: {}, ejes: {} };
        const findSheet = (keyword) => {
            const lowerKey = keyword.toLowerCase();
            return workbook.SheetNames.find(n => n.toLowerCase().includes(lowerKey));
        };

        // 2. LOAD REGIONS
        let regionCount = 0;
        const regionSheet = findSheet('regió');
        if (regionSheet) {
            console.log(`Loading Regiones from ${regionSheet}...`);
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets[regionSheet]);
            for (const row of rows) {
                const desc = row['descripcion'] || row['Descripcion'];
                const num = row['Numero'] || row['numero'];
                if (desc) {
                    const normalizedDesc = normalize(desc);
                    const { data } = await supabase.from('regiones').insert({
                        descripcion: normalizedDesc.toUpperCase(), // Store UPPER for display consistency? User said "Mayúsculas y QUITA LOS ACENTOS" earlier. But now requested strict lower normalization for matching. I will store UPPER NO ACCENTS for cleanliness, but map with LOWER NO ACCENTS.
                        numero: parseInt(num) || 0
                    }).select('id').single();
                    if (data) {
                        lookups.regiones[normalizedDesc] = data.id;
                        regionCount++;
                    }
                }
            }
            console.log(`Loaded ${regionCount} regions.`);
        }

        // 2b. FETCH LOOKUPS
        const fetchLookup = async (table) => {
            const { data } = await supabase.from(table).select('id, descripcion, numero');
            if (data) {
                data.forEach(item => {
                    if (item.descripcion) lookups[table][normalize(item.descripcion)] = item.id;
                    if (item.numero) lookups[table][String(item.numero)] = item.id;
                });
            }
        };
        await fetchLookup('etapas');
        await fetchLookup('lineas');
        await fetchLookup('ejes');

        // 3. LOAD PROJECTS
        const projSheet = findSheet('proyecto_servicio');
        if (projSheet) {
            console.log(`Loading Projects from ${projSheet}...`);
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets[projSheet], { header: 1 });
            const dataRows = rows.slice(1);
            let count = 0;

            for (const row of dataRows) {
                if (!row || row.length < 2) continue;

                const year = parseInt(row[1]) || 2024;
                const ejeRaw = row[2];
                const lineaRaw = row[3];
                const nombre = row[4] ? String(row[4]).trim() : 'Sin Nombre';
                const regionRaw = row[8];
                const benefRaw = row[9];
                const fondoRaw = row[10];

                // Logic: Try 11. If 0/Empty, try 13.
                let contraRaw = row[11];
                if ((!contraRaw || contraRaw == 0 || contraRaw == '0') && row[13]) {
                    contraRaw = row[13];
                }

                const estadoRaw = row[12];

                const cleanMoney = (v) => parseFloat(String(v || 0).replace(/[$,\s]/g, '')) || 0;
                const mf = cleanMoney(fondoRaw);
                const mc = cleanMoney(contraRaw);
                const total = mf + mc;
                const benef = parseInt(String(benefRaw || 0).replace(/,/g, '')) || 0;

                let ejeId = lookups.ejes[String(ejeRaw)] || lookups.ejes[normalize(ejeRaw)];
                let lineaId = lookups.lineas[String(lineaRaw)] || lookups.lineas[normalize(lineaRaw)];

                let regionId = null;
                const aliases = {
                    'lima metropolitana': 'lima',
                    'lima provincias': 'lima',
                    'provincia constitucional del callao': 'callao',
                    'multiregional': 'multirregional'
                };

                if (regionRaw) {
                    const normReg = normalize(regionRaw);
                    regionId = lookups.regiones[normReg];
                    if (!regionId && aliases[normReg]) {
                        regionId = lookups.regiones[normalize(aliases[normReg])]; // Lookup the ALIAS, which is normalized content
                    }
                    if (!regionId) console.log(`❌ Region Lookup Failed: Raw='${regionRaw}' Norm='${normReg}'`);
                }

                const estado = estadoRaw ? String(estadoRaw).trim() : 'Por definir';

                const payload = {
                    codigo_proyecto: `P-${year}-${count + 1}-${Date.now()}`,
                    nombre: nombre,
                    año: year,
                    eje_id: ejeId,
                    linea_id: lineaId,
                    region_id: regionId,
                    estado: estado,
                    monto_fondoempleo: mf,
                    monto_contrapartida: mc,
                    monto_total: total,
                    beneficiarios: benef
                };

                const { error } = await supabase.from('proyectos_servicios').insert(payload);
                if (error) console.error(`Error Row ${count + 2}:`, error.message);
                else count++;
            }
            console.log(`Loaded ${count} projects.`);
        }
        console.log('--- IMPORT COMPLETE ---');

    } catch (e) {
        console.error('Fatal:', e);
    }
}

importData();
