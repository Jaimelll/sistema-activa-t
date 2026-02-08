
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
const FILE_PATH = process.argv[2] || path.join(__dirname, '../Base4.xlsx');

// Normalizers
const normText = (txt) => txt ? txt.toString().trim() : ''; // Case sensitive? User implied exact text match for Region/Modalidad
const normNum = (val) => {
    if (val === undefined || val === null || val === '') return null;
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
};
const parseMoney = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    let s = val.toString().replace(/,/g, '').replace(/[^\d.-]/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
};

async function importData() {
    try {
        console.log('Reading Excel file from:', FILE_PATH);
        const workbook = xlsx.readFile(FILE_PATH);

        // --- 1. Clean Tables ---
        console.log('Cleaning tables (TRUNCATE)...');
        // Order matters for FK
        const tables = ['becas', 'proyectos_servicios', 'ejes', 'lineas', 'regiones', 'etapas', 'modalidades', 'instituciones_ejecutoras'];
        for (const t of tables) {
            await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }

        // --- 2. Load Catalogs ---
        const mapEjes = {};      // Key: Numero (int) -> UUID
        const mapLineas = {};    // Key: Numero (int) -> UUID
        const mapRegiones = {};  // Key: Descripcion (string) -> UUID
        const mapModalidades = {}; // Key: Descripcion (string) -> UUID
        const mapEtapas = {};    // Key: Descripcion (string) -> UUID
        const mapInstituciones = {}; // Key: Nombre (string) -> UUID

        // Helper for Catalogs
        const loadCatalog = async (sheetName, listName, keyCol, mapObj, isNumericKey = false, dbTable) => {
            if (!workbook.Sheets[sheetName]) {
                console.error(`Missing Sheet: ${sheetName}`);
                return;
            }
            console.log(`Loading ${listName}...`);
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

            for (const row of rows) {
                // Determine Description/Nombre
                let desc = row['descripcion'] || row['nombre'] || row['fase'] || row['modalidad'] || row['región'] || row['LINEA'] || row['EJE'];
                // Fallback for Eje/Linea if description is missing but Number exists?
                // Usually catalogs have 'descripcion'.

                // Specific overrides based on sheet inspection logic or standard expectation
                if (listName === 'Ejes' || listName === 'Lineas') {
                    // Eje/Linea sheets usually have 'Numero' and 'Description'/'Nombre'
                    // We need to insert into DB.
                    if (!desc && row['descripcion']) desc = row['descripcion'];
                }

                // If no desc found, skip creation? Or use key?
                if (!desc && isNumericKey) desc = `${listName} ${row[keyCol]}`;
                if (!desc) continue;

                // Normalize Key for Map (The Value we will LOOKUP from data sheets)
                let keyVal = row[keyCol];
                if (isNumericKey) keyVal = normNum(keyVal);
                else keyVal = normText(keyVal);

                if (keyVal === null || keyVal === '') continue;

                // Insert into DB
                // Note: DB schema for axes/lineas might not have 'numero' column.
                // We map 5 -> ID in memory, but only store description in DB to be safe.
                const payload = { descripcion: desc };
                // if (isNumericKey) payload.numero = keyVal; // REMOVED to avoid "column does not exist" error

                // Modalidades/Regiones/Etapas might not have 'numero' column in DB V3 schema?
                // Check schema:
                // ejes(numero, descripcion)
                // lineas(numero, descripcion)
                // regiones(numero, descripcion)
                // etapas(numero, descripcion)
                // modalidades(numero, descripcion)
                // instituciones(nombre) -> unique

                // Check if exists first
                let existing = null;
                // Always check by DESCRIPTION because we might not have stored 'numero'
                const { data } = await supabase.from(dbTable).select('id').eq('descripcion', desc).maybeSingle();
                existing = data;

                if (existing) {
                    mapObj[keyVal] = existing.id;
                    if (!isNumericKey) mapObj[keyVal.toLowerCase()] = existing.id;
                } else {
                    const { data: created, error } = await supabase.from(dbTable).insert(payload).select('id').single();
                    if (created) {
                        mapObj[keyVal] = created.id;
                        if (!isNumericKey) mapObj[keyVal.toLowerCase()] = created.id;
                    } else if (error) {
                        console.log(`Error insert ${dbTable} (Desc: ${desc}):`, error.message);
                    }
                }
            }
            console.log(`Loaded ${Object.keys(mapObj).length} ${listName}.`);
        };

        // Execution of Catalog Loading
        await loadCatalog('eje', 'Ejes', 'Numero', mapEjes, true, 'ejes');
        await loadCatalog('linea', 'Lineas', 'Numero', mapLineas, true, 'lineas');

        // Modalidad de Ejecución
        // Sheet: 'modalidad de ejecución'. Key: 'descripcion' (or 'modalidad'?).
        // Debug headers showed: ['modalidad de ejecución'] sheet content?
        // Let's assume similar structure or text based.
        await loadCatalog('modalidad de ejecución', 'Modalidades', 'descripcion', mapModalidades, false, 'modalidades');

        // Regiones
        await loadCatalog('región', 'Regiones', 'descripcion', mapRegiones, false, 'regiones');

        // Etapas (Not explicitly requested strictly but needed for correctness)
        await loadCatalog('etapa', 'Etapas', 'descripcion', mapEtapas, false, 'etapas');


        // --- 3. Data Loading ---

        const getInstId = async (name) => {
            const cleanName = normText(name);
            if (!cleanName) return null;
            if (mapInstituciones[cleanName]) return mapInstituciones[cleanName];

            // Upsert
            const { data } = await supabase.from('instituciones_ejecutoras').upsert({ nombre: cleanName }, { onConflict: 'nombre' }).select('id').single();
            if (data) {
                mapInstituciones[cleanName] = data.id;
                return data.id;
            }
            return null;
        };

        const processSheet = async (sheetName, dbTable, idCol) => {
            if (!workbook.Sheets[sheetName]) {
                console.log(`Skipping ${sheetName} (Not found)`);
                return;
            }
            console.log(`Importing ${sheetName}...`);
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
            let count = 0;

            // Iterate with index for synthetic code generation
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                try {
                    // STRICT MAPPING
                    // Excel Header -> Variable

                    // 1. Eje (Numeric)
                    const ejeVal = normNum(row['eje']);
                    const ejeId = mapEjes[ejeVal] || null;

                    // 2. Linea (Numeric) - 'línea' with accent
                    const lineaVal = normNum(row['línea']);
                    const lineaId = mapLineas[lineaVal] || null;

                    // 3. Modalidad (Text) - 'modalidad de ejecución'
                    const modVal = normText(row['modalidad de ejecución']);
                    const modalidadId = mapModalidades[modVal] || mapModalidades[modVal?.toLowerCase()] || null;

                    // 4. Region (Text) - 'región'
                    const regVal = normText(row['región']);
                    const regionId = mapRegiones[regVal] || mapRegiones[regVal?.toLowerCase()] || null;

                    // 5. Etapa (Text) - 'etapa'
                    const etapaVal = normText(row['etapa']);
                    const etapaId = mapEtapas[etapaVal] || mapEtapas[etapaVal?.toLowerCase()] || null;

                    // 6. Basic Fields
                    const nombre = normText(row['nombre proyecto o servicio']);
                    let codigo = normText(row['código del proyecto']);
                    const periodo = normNum(row['periodo']);

                    // SYNTHETIC CODE GENERATION
                    // If code is null, empty or 'Sin código', generate SC-{Period}-{RowIndex}
                    if (!codigo || codigo.toLowerCase() === 'sin código') {
                        const sanePeriod = periodo || new Date().getFullYear();
                        codigo = `SC-${sanePeriod}-${i + 2}`; // i+2 because 0-indexed + header row
                        // console.log(`Generated Synthetic Code: ${codigo} for row ${i+2}`);
                        // Note: If multiple 'Sin código' exist, this UNIQUE string prevents constraint violation.
                    }

                    const beneficiarios = normNum(row['cantidad de beneficiarios']);
                    const fondo = parseMoney(row['fondoempleo ']) || parseMoney(row['fondoempleo']); // Try both with/without space
                    const contra = parseMoney(row['contrapartida ']) || parseMoney(row['contrapartida']);

                    const instId = await getInstId(row['institución ejecutora']);

                    // code is guaranteed to exist now (synthetic or real)

                    const payload = {
                        [idCol]: codigo, // codigo_beca or codigo_proyecto
                        nombre: nombre,
                        año: periodo,
                        beneficiarios: beneficiarios || 0,
                        monto_fondoempleo: fondo,
                        monto_contrapartida: contra,
                        monto_total: (fondo + contra), // Calc total?

                        eje_id: ejeId,
                        linea_id: lineaId,
                        region_id: regionId,
                        etapa_id: etapaId,
                        modalidad_id: modalidadId,
                        institucion_ejecutora_id: instId,

                        estado: etapaVal // Use text for 'estado' column as well
                    };

                    const { error } = await supabase.from(dbTable).upsert(payload, { onConflict: idCol });
                    if (error) {
                        console.error(`Err ${dbTable} ${codigo}:`, error.message);
                    } else {
                        count++;
                    }
                } catch (rowErr) {
                    console.error(`Row Error in ${sheetName}:`, rowErr.message);
                }
            }
            console.log(`Success: ${count} records in ${dbTable}`);
        };

        // Execute Data Load
        await processSheet('proyecto_servicio', 'proyectos_servicios', 'codigo_proyecto');
        await processSheet('beca', 'becas', 'codigo_beca');

    } catch (e) {
        console.error('Fatal:', e);
    }
}

importData();
