
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
const FILE_PATH = process.argv[2] || 'c:/trabajo/fondo/Base5.xlsx';

// Helpers
const getVal = (row, possibleKeys) => {
    // 1. Try exact match
    for (const k of possibleKeys) {
        if (row[k] !== undefined) return row[k];
    }
    // 2. Try case-insensitive match with Normalization
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
            // 1. Try direct number
            const asNum = normNum(val);
            if (asNum !== null) return asNum;

            // 2. Try text lookup
            const txt = cleanText(val);
            if (!txt) return null;

            if (mapData.map[txt]) return mapData.map[txt];

            // 3. Create if missing
            const newId = mapData.maxId + 1;
            // Use original value as description reference? Or just the text?
            // Since 'regiones' table has 'descripcion' NOT null constrained (wait, SQL said unique).
            // Let's use clean upper case for consistency if it's new.
            const newDesc = txt; // Assuming txt is already UPPER CLEAN from cleanText.

            const payload = { id: newId, descripcion: newDesc };

            const { error } = await supabase.from(dbTable).insert(payload);
            if (error) {
                // Maybe partial unique violation if cleanText matches but map missed it? Unlikely.
                // console.error(`Error creating ${dbTable} ${txt}:`, error.message);
                // Try fetching again
                return null;
            }

            // Update map
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
            if (!workbook.Sheets[sheetName]) return;
            console.log(`Processing ${sheetName}...`);
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
            let count = 0;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];

                // Robust Mappings: ID if available, else Lookup
                const ejeId = normNum(getVal(row, ['eje_id', 'eje', 'id_eje']));
                const lineaId = normNum(getVal(row, ['linea_id', 'linea', 'línea', 'id_linea']));

                const regionVal = getVal(row, ['region_id', 'region', 'región', 'id_region']);
                const regionId = await getLookupId(regionVal, regionData, 'regiones');

                const etapaVal = getVal(row, ['etapa_id', 'etapa', 'id_etapa']);
                const etapaId = await getLookupId(etapaVal, etapaData, 'etapas');

                const modVal = getVal(row, ['modalidad_id', 'modalidad', 'modalidad de ejecución', 'id_modalidad']);
                const modId = await getLookupId(modVal, modalidadData, 'modalidades');

                const nombre = getVal(row, [nameKey, 'nombre', 'proyecto']);
                let codigo = getVal(row, [codeKey, 'codigo', 'código']);
                const periodo = normNum(getVal(row, ['periodo', 'año', 'anio']));

                if (!codigo || (typeof codigo === 'string' && codigo.toLowerCase() === 'sin código')) {
                    codigo = `SC-${periodo || 2024}-${i + 2}`;
                }

                const beneficiarios = normNum(getVal(row, ['beneficiarios', 'cantidad de beneficiarios']));

                // Money
                const fondo = parseMoney(getVal(row, ['monto_fondoempleo', 'fondoempleo', 'fondo empleo']));
                const contra = parseMoney(getVal(row, ['monto_contrapartida', 'contrapartida', 'aporte contrapartida']));

                const instName = getVal(row, ['institución ejecutora', 'institucion_ejecutora', 'institucion']);
                const instId = await getInstId(instName);

                const payload = {
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
                    estado: getVal(row, ['estado', 'etapa'])
                };

                const { error } = await supabase.from(dbTable).upsert(payload, { onConflict: codeKey });
                if (error) {
                    console.error(`Error row ${codigo} in ${dbTable}:`, error.message);
                } else {
                    count++;
                }
            }
            console.log(`Imported ${count} records into ${dbTable}`);
        };

        await processSheet('proyecto_servicio', 'proyectos_servicios', 'codigo_proyecto', 'nombre proyecto o servicio');
        await processSheet('beca', 'becas', 'codigo_beca', 'nombre beca');

    } catch (e) {
        console.error("Critical Error in Import:", e);
    }
}

importData();
