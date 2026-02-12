
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        persistSession: false
    }
});
const FILE_PATH = 'c:/trabajo/fondo/Base7.xlsx';

// --- Helpers ---
const getVal = (row, possibleKeys) => {
    const rowKeys = Object.keys(row);
    for (const k of possibleKeys) {
        if (row[k] !== undefined) return row[k];
        const lowerK = k.toLowerCase().normalize("NFC").trim();
        const foundKey = rowKeys.find(rk => rk.toLowerCase().normalize("NFC").trim() === lowerK);
        if (foundKey && row[foundKey] !== undefined) return row[foundKey];
    }
    return undefined;
};

const normNum = (val) => {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'string' && val.trim() === '') return null;
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
};

const cleanText = (txt) => {
    if (!txt) return '';
    return txt.toString().trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const parseMoney = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    let s = val.toString().replace(/,/g, '');
    s = s.replace(/[^\d.-]/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
};

async function importData() {
    try {
        console.log('Reading Excel file from:', FILE_PATH);
        const workbook = xlsx.readFile(FILE_PATH);

        // --- 0. CLEANING TABLES ---
        console.log('Cleaning existing tables...');

        const { error: err1 } = await supabase.from('becas').delete().neq('id', 0);
        if (err1) console.error('Error cleaning becas:', err1.message);
        else console.log('Becas table cleaned.');

        const { error: err2 } = await supabase.from('proyectos_servicios').delete().neq('id', 0);
        if (err2) console.error('Error cleaning proyectos_servicios:', err2.message);
        else console.log('Proyectos_servicios table cleaned.');

        // --- 1. Load Catalogs ---
        console.log('Loading Catalogs...');

        const loadCatalog = async (sheetName, dbTable, idKeys, descKeys, isUpperCase = false) => {
            if (!workbook.Sheets[sheetName]) {
                console.error(`Missing Sheet: ${sheetName}`);
                return;
            }
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
            let count = 0;

            for (const row of rows) {
                const idVal = normNum(getVal(row, idKeys));
                let desc = getVal(row, descKeys);

                if (idVal === null) continue;
                if (!desc) desc = `Item ${idVal}`;

                if (isUpperCase && typeof desc === 'string') {
                    desc = desc.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                }

                const payload = { id: idVal, descripcion: desc };
                const { error } = await supabase.from(dbTable).upsert(payload);
                if (error) {
                    console.error(`Error upsert ${dbTable} ID ${idVal}:`, error.message);
                } else {
                    count++;
                }
            }
            console.log(`Loaded ${count} records into ${dbTable} from ${sheetName}`);
        };

        await loadCatalog('eje', 'ejes', ['Numero', 'id'], ['descripcion', 'nombre']);
        await loadCatalog('linea', 'lineas', ['Numero', 'id'], ['descripcion', 'nombre']);
        await loadCatalog('etapa', 'etapas', ['Numero', 'id'], ['descripcion', 'nombre']);
        await loadCatalog('región', 'regiones', ['Numero', 'id', 'numero'], ['descripcion', 'nombre'], true);
        await loadCatalog('modalidad de ejecución', 'modalidades', ['Numero', 'id', 'numero'], ['descripcion', 'modalidad']);


        // --- 2. Build Lookup Maps ---
        const buildMap = async (table) => {
            const { data } = await supabase.from(table).select('id, descripcion');
            const map = {};
            let maxId = 0;
            if (data) {
                data.forEach(item => {
                    const key = cleanText(item.descripcion);
                    if (key) map[key] = item.id;
                    if (item.id > maxId) maxId = item.id;
                });
            }
            return { map, maxId };
        };

        const regionData = await buildMap('regiones');
        const etapaData = await buildMap('etapas');
        const modalidadData = await buildMap('modalidades');
        const ejeData = await buildMap('ejes');
        const lineaData = await buildMap('lineas');

        const getLookupId = async (val, mapData, dbTable) => {
            const asNum = normNum(val);
            if (asNum !== null) return asNum;

            const txt = cleanText(val);
            if (!txt) return null;

            if (mapData.map[txt]) return mapData.map[txt];

            const newId = mapData.maxId + 1;
            const newDesc = txt;
            const payload = { id: newId, descripcion: newDesc };
            const { error } = await supabase.from(dbTable).insert(payload);
            if (error) {
                console.error(`Failed to auto-create ${dbTable}: ${txt}`, error.message);
                return null;
            }

            mapData.map[txt] = newId;
            mapData.maxId = newId;
            console.log(`Created new ${dbTable}: ${txt} (ID: ${newId})`);
            return newId;
        };

        // Institutions Helper
        const mapInstituciones = {};
        const getInstId = async (name) => {
            if (!name) return null;
            const cleanName = name.toString().trim();
            if (!cleanName) return null;
            if (mapInstituciones[cleanName]) return mapInstituciones[cleanName];

            console.log(`[DEBUG] Looking up Inst: "${cleanName}"`);
            const { data, error } = await supabase.from('instituciones_ejecutoras').select('id').eq('nombre', cleanName).maybeSingle();
            if (error) console.error(`[DEBUG] Error lookup inst: ${error.message}`);

            if (data) {
                mapInstituciones[cleanName] = data.id;
                return data.id;
            }

            console.log(`[DEBUG] Creating Inst: "${cleanName}"`);
            const { data: newInst, error: insertError } = await supabase.from('instituciones_ejecutoras').insert({ nombre: cleanName }).select('id').single();
            if (insertError) console.error(`[DEBUG] Error insert inst: ${insertError.message}`);

            if (newInst) {
                mapInstituciones[cleanName] = newInst.id;
                return newInst.id;
            }
            return null;
        };


        // --- 3. Process Main Tables ---
        const processSheet = async (sheetName, dbTable, idLimitExpectation) => {
            if (!workbook.Sheets[sheetName]) {
                console.log(`Sheet ${sheetName} not found.`);
                return;
            }
            console.log(`Processing ${sheetName}...`);
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
            console.log(`Found ${rows.length} rows in ${sheetName}`);

            let count = 0;
            let importedIds = [];

            for (let i = 0; i < rows.length; i++) {
                if (i === 0) console.log('Processing row 0...');
                const row = rows[i];

                const numeroID = normNum(getVal(row, ['N°', 'Numero', 'NUMERO', 'No', 'N', 'numero']));
                if (!numeroID) continue;

                if (importedIds.includes(numeroID)) {
                    console.warn(`Duplicate ID ${numeroID} in ${sheetName} (Row ${i}). Skipping.`);
                    continue;
                }
                importedIds.push(numeroID);

                // Common Mappings
                const regionVal = getVal(row, ['region_id', 'REGION', 'region', 'región', 'id_region', 'Region']);
                const regionId = await getLookupId(regionVal, regionData, 'regiones');

                const isBeca = (dbTable === 'becas');

                // --- Safe Lookups ---
                let ejeId = normNum(getVal(row, ['eje_id', 'EJE', 'eje']));
                if (ejeId === null) ejeId = await getLookupId(getVal(row, ['eje_id', 'EJE', 'eje']), ejeData, 'ejes');

                let lineaId = normNum(getVal(row, ['linea_id', 'LINEA DE INTERVENCION', 'linea', 'línea']));
                if (lineaId === null) lineaId = await getLookupId(getVal(row, ['LINEA DE INTERVENCION', 'linea', 'línea']), lineaData, 'lineas');

                let etapaVal = getVal(row, ['etapa_id', 'ETAPA', 'etapa']);
                let etapaId = await getLookupId(etapaVal, etapaData, 'etapas');

                let modStr = getVal(row, ['modalidad_id', 'MODALIDAD', 'modalidad', 'modalidad de ejecución']);
                let modId = await getLookupId(modStr, modalidadData, 'modalidades');

                let nombre = getVal(row, ['NOMBRE DEL PROYECTO', 'nombre', 'proyecto', 'nombre proyecto', 'nombre proyecto o servicio', 'NOMBRE DE LA BECA', 'nombre_beca']);
                let codigo = getVal(row, ['CODIGO', 'codigo', 'código', 'codigo_proyecto', 'codigo_beca', 'código del proyecto']);
                let periodo = normNum(getVal(row, ['periodo', 'AÑO', 'año', 'anio', 'year']));

                let instName = getVal(row, ['institución ejecutora', 'GENERADORA', 'institucion_ejecutora', 'institucion', 'generadora']);

                if (i === 0) console.log(`[DEBUG] Row 0 Inst Name: ${instName}`);
                let instId = await getInstId(instName);
                if (i === 0) console.log(`[DEBUG] Row 0 Inst ID: ${instId}`);

                let gestoraVal = getVal(row, ['GESTORA', 'gestora']);
                let estadoVal = getVal(row, ['estado', 'etapa']);

                let beneficiarios = normNum(getVal(row, ['BENEFICIARIOS', 'beneficiarios', 'cantidad de beneficiarios', 'TOTAL BENEFICIARIOS']));

                let fondo = parseMoney(getVal(row, ['MONTO FONDOEMPLEO', 'monto_fondoempleo', 'fondoempleo', 'fondoempleo ']));
                let contra = parseMoney(getVal(row, ['MONTO CONTRAPARTIDA', 'monto_contrapartida', 'contrapartida', 'contrapartida ']));

                // Fallback Code
                if (!codigo || (typeof codigo === 'string' && codigo.toLowerCase().includes('sin código'))) {
                    const prefix = isBeca ? 'BECA' : 'PRJ';
                    codigo = `${prefix}-${periodo || 2024}-${numeroID}`;
                }

                const payload = {
                    id: numeroID,
                    [isBeca ? 'codigo_beca' : 'codigo_proyecto']: codigo,
                    nombre,
                    año: periodo,
                    beneficiarios: beneficiarios || 0,
                    monto_fondoempleo: fondo,
                    monto_contrapartida: contra,
                    monto_total: (fondo + contra),
                    eje_id: ejeId,
                    linea_id: lineaId,
                    region_id: regionId,
                    etapa_id: etapaId,
                    modalidad_id: modId,
                    institucion_ejecutora_id: instId,
                    gestora: gestoraVal,
                    estado: estadoVal
                };

                if (i === 0) console.log(`[DEBUG] Upserting Row 0 Payload:`, JSON.stringify(payload));

                const { error } = await supabase.from(dbTable).upsert(payload, { onConflict: 'id' });

                if (i === 0) console.log(`[DEBUG] Row 0 Upsert Result: ${error ? error.message : 'Success'}`);

                if (error) {
                    console.error(`FAILED ROW ${i} (ID: ${numeroID}) in ${dbTable}`);
                    console.error('Error:', error.message);
                } else {
                    count++;
                }

                if (count % 100 === 0) console.log(`  Imported ${count}...`);
            }
            console.log(`Finished ${dbTable}: Imported ${count} records. (Expected: ${idLimitExpectation})`);
        };

        await processSheet('proyecto_servicio', 'proyectos_servicios', 497);
        await processSheet('beca', 'becas', 811);

    } catch (e) {
        console.error("Critical Error:", e);
    }
}

importData();
