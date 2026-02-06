
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
const FILE_PATH = path.join(__dirname, '..', 'Base3.xlsx');

const normalizeStr = (str) => str ? String(str).trim() : "";
const normalizeRegion = (str) => str ? String(str).trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "SIN REGION";
const parseNumber = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const clean = String(val).replace(/,/g, '');
    return parseFloat(clean) || 0;
}

// Improved Dedupe
const dedupeBy = (arr, keyFn) => {
    const map = new Map();
    arr.forEach(item => {
        try {
            const k = keyFn(item);
            if (k !== null && k !== undefined && k !== "" && !map.has(k)) map.set(k, item);
        } catch (e) {
            console.warn("Dedupe key error:", e);
        }
    });
    return Array.from(map.values());
};

async function runStrictImport() {
    try {
        console.log(`Loading Excel from ${FILE_PATH}...`);
        const workbook = xlsx.readFile(FILE_PATH);

        const sheetToJson = (name) => {
            const n = workbook.SheetNames.find(s => s.toLowerCase().trim() === name.toLowerCase().trim());
            if (!n) {
                console.warn(`WARNING: Sheet '${name}' NOT FOUND. Available: ${workbook.SheetNames.join(', ')}`);
                return [];
            }
            return xlsx.utils.sheet_to_json(workbook.Sheets[n]);
        };

        // 1. CLEANUP
        console.log('Step 1: Truncating Tables...');
        // Delete Projects first
        const { error: errProj } = await supabase.from('proyectos_servicios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (errProj) console.warn("Delete Proj Error:", errProj.message);

        const tables = ['lineas', 'ejes', 'etapas', 'regiones', 'instituciones_ejecutoras'];
        for (let t of tables) {
            const { error } = await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // ID is uuid or int? V3 says UUID.
            // Some tables might look different? checking schema... all UUID default.
            if (error) console.warn(`Delete ${t} Error:`, error.message);
        }
        console.log('Tables cleared (best effort).');

        // 2. MASTERS

        // ETAPAS
        console.log('Step 2: Loading Etapas...');
        const etapasRows = sheetToJson('etapa');
        const etapasMap = {}; // KEY -> ID
        if (etapasRows.length) {
            let payload = etapasRows.map(r => {
                const kDesc = Object.keys(r).find(k => k.match(/descripcion|nombre|etapa/i));
                const val = normalizeStr(r[kDesc]);
                return val ? { descripcion: val } : null;
            }).filter(x => x);

            payload = dedupeBy(payload, x => x.descripcion.toUpperCase());

            if (payload.length) {
                const { data, error } = await supabase.from('etapas').insert(payload).select();
                if (error) throw new Error("Etapa insert: " + error.message);
                data.forEach(d => {
                    etapasMap[d.descripcion.toUpperCase()] = d.id;
                    etapasMap[d.descripcion] = d.id;
                });
            }
        }

        // EJES
        console.log('Step 3: Loading Ejes...');
        const ejesRows = sheetToJson('eje');
        const ejesMap = {};
        if (ejesRows.length) {
            let payload = ejesRows.map(r => {
                const kDesc = Object.keys(r).find(k => k.match(/descripcion|nombre|eje/i));
                const kNum = Object.keys(r).find(k => k.match(/numero|id/i));
                const desc = normalizeStr(r[kDesc]);
                let num = kNum ? parseInt(r[kNum]) : null;
                if (isNaN(num)) num = null;

                return desc ? { descripcion: desc, numero: num } : null;
            }).filter(x => x);

            // Dedupe strategy: If number exists, use it. Else description.
            payload = dedupeBy(payload, x => (x.numero !== null) ? x.numero : x.descripcion.toUpperCase());

            if (payload.length) {
                const { data, error } = await supabase.from('ejes').insert(payload).select();
                if (error) throw new Error("Ejes insert: " + error.message);
                data.forEach(d => {
                    ejesMap[d.descripcion.toUpperCase()] = d.id;
                    ejesMap[d.descripcion] = d.id;
                    if (d.numero !== null) ejesMap[String(d.numero)] = d.id;
                });
            }
        }

        // LINEAS
        console.log('Step 4: Loading Lineas...');
        const lineasRows = sheetToJson('linea');
        const lineasMap = {};
        if (lineasRows.length) {
            let payload = lineasRows.map(r => {
                const kDesc = Object.keys(r).find(k => k.match(/descripcion|nombre|linea|línea/i));
                const kNum = Object.keys(r).find(k => k.match(/numero|id/i));
                const desc = normalizeStr(r[kDesc]);
                let num = kNum ? parseInt(r[kNum]) : null;
                if (isNaN(num)) num = null;

                return desc ? { descripcion: desc, numero: num } : null;
            }).filter(x => x);

            payload = dedupeBy(payload, x => (x.numero !== null) ? x.numero : x.descripcion.toUpperCase());

            if (payload.length) {
                const { data, error } = await supabase.from('lineas').insert(payload).select();
                if (error) throw new Error("Lineas insert: " + error.message);
                data.forEach(d => {
                    lineasMap[d.descripcion.toUpperCase()] = d.id;
                    lineasMap[d.descripcion] = d.id;
                    if (d.numero !== null) lineasMap[String(d.numero)] = d.id;
                });
            }
        }

        // 3. PROJECTS
        console.log('Step 5: Process Projects...');
        let projSheet = workbook.SheetNames.find(n => n.toLowerCase().includes('proyecto'));
        if (!projSheet) projSheet = workbook.SheetNames[0];
        const projRows = xlsx.utils.sheet_to_json(workbook.Sheets[projSheet]);

        // AUTO-CATALOGS (Regiones / Inst)
        const regionesSet = new Set();
        const instSet = new Set();
        const preparedRows = [];

        for (let r of projRows) {
            const keys = Object.keys(r);
            const findK = (pats) => keys.find(k => pats.some(p => k.toLowerCase().includes(p)));
            const region = normalizeRegion(r[findK(['regi', 'region'])]);
            const inst = normalizeStr(r[findK(['instituci', 'ejecutora'])]);
            if (region) regionesSet.add(region);
            if (inst) instSet.add(inst);
            preparedRows.push({ r, findK, region, inst });
        }

        const regionesMap = {};
        if (regionesSet.size) {
            const payload = Array.from(regionesSet).map(d => ({ descripcion: d }));
            // Regiones might strictly be unique, upsert is safe here as it's a derived catalog
            const { data } = await supabase.from('regiones').upsert(payload, { onConflict: 'descripcion' }).select();
            if (data) data.forEach(d => regionesMap[d.descripcion] = d.id);
        }
        const instMap = {};
        if (instSet.size) {
            const payload = Array.from(instSet).map(d => ({ nombre: d }));
            const { data } = await supabase.from('instituciones_ejecutoras').upsert(payload, { onConflict: 'nombre' }).select();
            if (data) data.forEach(d => instMap[d.nombre] = d.id);
        }

        const toInsert = [];
        for (let { r, findK, region, inst } of preparedRows) {
            const nombre = normalizeStr(r[findK(['nombre', 'proyecto'])]);
            const año = parseNumber(r[findK(['año', 'anio', 'periodo'])]);

            const ejeVal = normalizeStr(r[findK(['eje'])]);
            const lineaVal = normalizeStr(r[findK(['linea', 'línea'])]);
            const etapaVal = normalizeStr(r[findK(['etapa', 'estado'])]);

            let eje_id = ejesMap[ejeVal.toUpperCase()] || ejesMap[ejeVal];
            let linea_id = lineasMap[lineaVal.toUpperCase()] || lineasMap[lineaVal];
            let etapa_id = etapasMap[etapaVal.toUpperCase()] || etapasMap[etapaVal];

            // Try numeric lookup if value looks numeric
            if (!eje_id && !isNaN(parseInt(ejeVal))) eje_id = ejesMap[String(parseInt(ejeVal))];
            if (!linea_id && !isNaN(parseInt(lineaVal))) linea_id = lineasMap[String(parseInt(lineaVal))];

            // Strict ID check - warn if missing
            if (ejeVal && !eje_id) console.log(`Warning: Project '${nombre}' has Eje '${ejeVal}' NOT FOUND in Master.`);
            if (lineaVal && !linea_id) console.log(`Warning: Project '${nombre}' has Linea '${lineaVal}' NOT FOUND in Master.`);

            toInsert.push({
                año,
                nombre,
                region_id: regionesMap[region],
                institucion_ejecutora_id: instMap[inst],
                eje_id,
                linea_id,
                etapa_id,
                monto_fondoempleo: parseNumber(r[findK(['fondoempleo'])]),
                monto_contrapartida: parseNumber(r[findK(['contrapartida'])]),
                beneficiarios: parseNumber(r[findK(['beneficiarios'])]),
                estado: etapaVal
            });
        }

        if (toInsert.length > 0) {
            console.log(`Inserting ${toInsert.length} projects...`);
            const { error } = await supabase.from('proyectos_servicios').insert(toInsert);
            if (error) throw new Error("Projects insert: " + error.message);
            else console.log(`SUCCESS: ${toInsert.length} projects inserted.`);
        }

        console.log('Strict import completed.');

    } catch (e) {
        console.error('FATAL Script Error:', e);
        process.exit(1);
    }
}

runStrictImport();
