
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
// UPDATED FILE PATH
const FILE_PATH = 'c:/trabajo/fondo/Base6.xlsx';

// Helpers
const getVal = (row, possibleKeys) => {
    for (const k of possibleKeys) {
        if (row[k] !== undefined) return row[k];
    }
    const rowKeys = Object.keys(row);
    for (const k of possibleKeys) {
        const lowerK = k.toLowerCase().normalize("NFC").trim();
        const foundKey = rowKeys.find(rk => rk.toLowerCase().normalize("NFC").trim() === lowerK);
        if (foundKey && row[foundKey] !== undefined) return row[foundKey];
    }
    return undefined;
};

const normNum = (val) => {
    if (val === undefined || val === null || val === '') return null;
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
};

const cleanText = (txt) => {
    if (!txt) return '';
    return txt.toString().trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

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

        // --- 0. CLEANING TABLES (Requested by User) ---
        console.log('Cleaning proyectos_servicios table...');
        const { error: delError } = await supabase.from('proyectos_servicios').delete().neq('id', 0); // Delete all
        if (delError) console.error('Error cleaning table:', delError.message);
        else console.log('Table cleaned.');

        // --- 1. Load Catalogs ---
        console.log('Loading Catalogs with strict IDs...');

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

                if (!idVal) continue;
                if (!desc) desc = `Item ${idVal}`;

                if (isUpperCase && typeof desc === 'string') {
                    desc = desc.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                }

                const payload = { id: idVal, descripcion: desc };
                const { error } = await supabase.from(dbTable).upsert(payload);
                if (error) console.error(`Error upsert ${dbTable} ${idVal}:`, error.message);
                else count++;
            }
            console.log(`Loaded ${count} records into ${dbTable} from ${sheetName}`);
        };

        // Mapeo flexible
        await loadCatalog('eje', 'ejes', ['Numero', 'id'], ['descripcion', 'nombre']);
        await loadCatalog('linea', 'lineas', ['Numero', 'id'], ['descripcion', 'nombre']);
        await loadCatalog('etapa', 'etapas', ['Numero', 'id'], ['descripcion', 'nombre']);
        await loadCatalog('región', 'regiones', ['Numero', 'id', 'numero'], ['descripcion', 'nombre'], true);

        const modSheet = workbook.Sheets['modalidad de ejecución'] ? 'modalidad de ejecución' : 'modalidad';
        await loadCatalog(modSheet, 'modalidades', ['Numero', 'id', 'numero'], ['descripcion', 'modalidad']);


        // --- 2. Build Lookup Maps (Reverse Lookup: Text -> ID) ---
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
            if (error) return null;

            mapData.map[txt] = newId;
            mapData.maxId = newId;
            console.log(`Created new ${dbTable}: ${txt} (ID: ${newId})`);
            return newId;
        };


        // --- 3. Institutions Helper ---
        const mapInstituciones = {};
        const getInstId = async (name) => {
            if (!name) return null;
            const cleanName = name.toString().trim();
            if (!cleanName) return null;
            if (mapInstituciones[cleanName]) return mapInstituciones[cleanName];

            const { data } = await supabase.from('instituciones_ejecutoras').select('id').eq('nombre', cleanName).maybeSingle();
            if (data) {
                mapInstituciones[cleanName] = data.id;
                return data.id;
            }
            const { data: newInst } = await supabase.from('instituciones_ejecutoras').insert({ nombre: cleanName }).select('id').single();
            if (newInst) {
                mapInstituciones[cleanName] = newInst.id;
                return newInst.id;
            }
            return null;
        };

        // --- 4. Process Projects & Becas ---
        const processSheet = async (sheetName, dbTable, codeKey, nameKey) => {
            if (!workbook.Sheets[sheetName]) {
                console.log(`Sheet ${sheetName} not found.`);
                return;
            }
            console.log(`Processing ${sheetName}...`);
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
            let count = 0;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];

                // *** ID LOGIC: Use 'Numero' column as ID ***
                const numeroID = normNum(getVal(row, ['N°', 'Numero', 'NUMERO', 'No', 'N']));
                if (!numeroID) {
                    console.log(`Skipping row ${i}: Missing 'Numero' (N°)`);
                    continue;
                }

                // Robust Mappings
                const ejeId = normNum(getVal(row, ['eje_id', 'EJE', 'eje', 'id_eje']));
                const lineaId = normNum(getVal(row, ['linea_id', 'LINEA DE INTERVENCION', 'linea', 'línea', 'id_linea']));

                const regionVal = getVal(row, ['region_id', 'REGION', 'region', 'región', 'id_region']);
                const regionId = await getLookupId(regionVal, regionData, 'regiones');

                const etapaVal = getVal(row, ['etapa_id', 'ETAPA', 'etapa', 'id_etapa']);
                const etapaId = await getLookupId(etapaVal, etapaData, 'etapas');

                const modVal = getVal(row, ['modalidad_id', 'MODALIDAD', 'modalidad', 'modalidad de ejecución', 'id_modalidad']);
                // Modalidad might be missing in these headers, let's check
                const modId = await getLookupId(modVal, modalidadData, 'modalidades');

                const nombre = getVal(row, [nameKey, 'NOMBRE DEL PROYECTO', 'nombre', 'proyecto']);
                let codigo = getVal(row, [codeKey, 'CODIGO', 'codigo', 'código']);
                const periodo = normNum(getVal(row, ['periodo', 'AÑO', 'año', 'anio']));

                // Generadora -> Institucion Ejecutora logic from Base5
                const instName = getVal(row, ['institución ejecutora', 'GENERADORA', 'institucion_ejecutora', 'institucion', 'generadora']);
                const instId = await getInstId(instName);

                // *** NEW FIELD: Gestora ***
                const gestoraVal = getVal(row, ['GESTORA', 'gestora', 'Gestora']);

                if (!codigo || (typeof codigo === 'string' && codigo.toLowerCase() === 'sin código')) {
                    codigo = `SC-${periodo || 2024}-${i + 2}`;
                }

                const beneficiarios = normNum(getVal(row, ['BENEFICIARIOS', 'beneficiarios', 'cantidad de beneficiarios']));

                // Money
                const fondo = parseMoney(getVal(row, ['MONTO FONDOEMPLEO', 'monto_fondoempleo', 'fondoempleo', 'fondo empleo']));
                const contra = parseMoney(getVal(row, ['MONTO CONTRAPARTIDA', 'monto_contrapartida', 'contrapartida', 'aporte contrapartida']));


                const payload = {
                    id: numeroID, // FORCE ID FROM EXCEL
                    [codeKey]: codigo,
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
                    gestora: gestoraVal, // Insert New Field
                    estado: getVal(row, ['estado', 'etapa'])
                };

                const { error } = await supabase.from(dbTable).upsert(payload, { onConflict: 'id' }); // Conflict on ID
                if (error) {
                    console.error(`Error row ID ${numeroID} in ${dbTable}:`, error.message);
                } else {
                    count++;
                }
            }
            console.log(`Imported ${count} records into ${dbTable}`);
        };

        await processSheet('proyecto_servicio', 'proyectos_servicios', 'codigo_proyecto', 'nombre proyecto o servicio');
        // If becas sheet exists and needs updating, add here. Assuming logic applies to main projects first.
        // await processSheet('beca', 'becas', 'codigo_beca', 'nombre beca');

    } catch (e) {
        console.error("Critical Error in Import:", e);
    }
}

importData();
