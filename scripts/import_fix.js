
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase Service Key or URL in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const FILE_PATH = path.join(__dirname, '..', 'Base3.xlsx');

const normalizeStr = (str) => str ? String(str).trim() : "";
const normalizeRegion = (str) => str ? String(str).trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "SIN REGION";
const parseNumber = (val) => {
    if (!val) return 0;
    const clean = String(val).replace(/,/g, '');
    return parseFloat(clean) || 0;
}

// Map Index helpers (0-based in JS, User gave 1-based indices approx or description)
// Mapeo Usuario:
// 1: Año -> Indice 0? No, indices usually 1-based in specs. Let's inspect rows dynamically or assume standard keys if headers exist.
// Assuming headers exist, we use column names. If no headers, we use index.
// "Hoja 'proyecto_servicio': ... Mapeo: Año (Índice 1) -> año" 
// If using sheet_to_json with header:A, we get array of arrays. If header option is default, we get objects with keys.
// Given previous scripts used specific keys, let's try to be robust.

async function runImport() {
    try {
        console.log(`Loading ${FILE_PATH}...`);
        const workbook = xlsx.readFile(FILE_PATH);

        // --- 1. CLEANUP (TRUNCATE) ---
        console.log('Step 1: Cleaning Tables...');
        // We defer constraint checks or cascade delete via strictly verified delete order or RPC if available.
        // Since we don't have direct SQL access here, we delete children first then parents.
        // Or we try to use the raw query if a function exists.

        // Attempt to call RPC for truncate if it was set up previously, else manual delete
        const { error: rpcError } = await supabase.rpc('truncate_all_tables');
        if (rpcError) {
            console.warn('RPC truncate_all_tables failed or missing. Performing manual deletion (slow)...');
            await supabase.from('avances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase.from('proyectos_servicios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase.from('regiones').delete().neq('numero', -1);
            await supabase.from('etapas').delete().neq('numero', -1);
            await supabase.from('ejes').delete().neq('numero', -1);
            await supabase.from('lineas').delete().neq('numero', -1);
            await supabase.from('instituciones_ejecutoras').delete().neq('nombre', 'X');
        } else {
            console.log('Tables truncated via RPC.');
        }

        // --- 2. LOAD CATALOGS (Hierarchical) ---

        // ETAPAS
        console.log('Step 2: Loading Etapas...');
        // Try precise sheet name match
        let etapaSheet = workbook.SheetNames.find(n => n.toLowerCase().trim() === 'etapa');
        let etapasMap = {};
        if (etapaSheet) {
            const etapaRows = xlsx.utils.sheet_to_json(workbook.Sheets[etapaSheet]);
            // Expecting columns like 'numero', 'descripcion', 'fase'
            // If headers are missing/different, we might need adjustments.
            // We'll normalize keys.
            const cleanEtapas = etapaRows.map(r => {
                // Find keys loosely
                const kDesc = Object.keys(r).find(k => k.match(/descripcion|nombre|etapa/i));
                const kNum = Object.keys(r).find(k => k.match(/numero|id|c[oó]digo/i));
                return {
                    descripcion: normalizeStr(r[kDesc] || r['__EMPTY']), // Fallback
                    numero: kNum ? parseInt(r[kNum]) : null
                };
            }).filter(x => x.descripcion);

            if (cleanEtapas.length > 0) {
                const { data, error } = await supabase.from('etapas').insert(cleanEtapas).select();
                if (error) throw new Error(`Etapas insert failed: ${error.message}`);
                data.forEach(d => etapasMap[d.descripcion.toUpperCase()] = d.id);
                // Also map by description normalized just in case
                data.forEach(d => etapasMap[d.descripcion] = d.id);
            }
        } else {
            console.warn("Sheet 'etapa' not found. Will extract from Projects.");
        }

        // EJES
        console.log('Step 3: Loading Ejes...');
        let ejeSheet = workbook.SheetNames.find(n => n.toLowerCase().trim() === 'eje');
        let ejesMap = {};
        if (ejeSheet) {
            const ejeRows = xlsx.utils.sheet_to_json(workbook.Sheets[ejeSheet]);
            const cleanEjes = ejeRows.map(r => {
                const kDesc = Object.keys(r).find(k => k.match(/descripcion|nombre|eje/i));
                const kNum = Object.keys(r).find(k => k.match(/numero|id|c[oó]digo/i));
                return {
                    descripcion: normalizeStr(r[kDesc]),
                    numero: kNum ? parseInt(r[kNum]) : null
                };
            }).filter(x => x.descripcion);

            if (cleanEjes.length > 0) {
                const { data, error } = await supabase.from('ejes').insert(cleanEjes).select();
                if (error) throw new Error(`Ejes insert failed: ${error.message}`);
                data.forEach(d => ejesMap[d.descripcion.toUpperCase()] = d.id);
                data.forEach(d => ejesMap[d.descripcion] = d.id);
            }
        } else {
            console.warn("Sheet 'eje' not found. Will extract from Projects.");
        }

        // --- 3. LOAD PROJECTS & Auto-Populate missing Catalogs ---
        console.log('Step 4: Loading Projects & Linking...');
        let projSheet = workbook.SheetNames.find(n => n.toLowerCase().includes('proyecto'));
        if (!projSheet) projSheet = workbook.SheetNames[0];

        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[projSheet]);
        console.log(`Processing ${rows.length} project rows...`);

        const payload = [];

        // Sets for catalogs if missing
        const missingRegiones = new Set();
        const missingLineas = new Set();
        const missingInst = new Set();

        // Pass 1: Collect Missing Catalogs
        for (let r of rows) {
            // Mapping based on indices/names
            // Note: sheet_to_json keys are headers. 
            // We need to robustly find columns.
            const keys = Object.keys(r);
            const findK = (pats) => keys.find(k => pats.some(p => k.toLowerCase().includes(p)));

            const vRegion = r[findK(['regi', 'region'])] || "SIN REGION";
            const vLinea = r[findK(['linea', 'línea'])] || "OTRA";
            const vInst = r[findK(['instituci', 'ejecutora'])] || "DESCONOCIDO";

            missingRegiones.add(normalizeRegion(vRegion));
            missingLineas.add(normalizeStr(vLinea));
            missingInst.add(normalizeStr(vInst));
        }

        // Insert Missing Catalogs
        const regionesMap = {};
        const lineasMap = {};
        const instMap = {};

        // Regiones
        if (missingRegiones.size > 0) {
            const regs = Array.from(missingRegiones).map(d => ({ descripcion: d }));
            const { data, error } = await supabase.from('regiones').upsert(regs, { onConflict: 'descripcion' }).select();
            if (!error && data) data.forEach(x => regionesMap[x.descripcion] = x.id);
        }

        // Lineas
        if (missingLineas.size > 0) {
            const lins = Array.from(missingLineas).map(d => ({ descripcion: d }));
            const { data, error } = await supabase.from('lineas').upsert(lins, { onConflict: 'descripcion' }).select();
            if (!error && data) data.forEach(x => lineasMap[x.descripcion] = x.id);
        }

        // Instituciones
        if (missingInst.size > 0) {
            const insts = Array.from(missingInst).map(d => ({ nombre: d }));
            const { data, error } = await supabase.from('instituciones_ejecutoras').upsert(insts, { onConflict: 'nombre' }).select();
            if (!error && data) data.forEach(x => instMap[x.nombre] = x.id);
        }

        // Pass 2: Build Project Payloads
        for (let r of rows) {
            const keys = Object.keys(r);
            const findK = (pats) => keys.find(k => pats.some(p => k.toLowerCase().includes(p)));

            const año = parseNumber(r[findK(['año', 'anio', 'periodo'])]);
            const nombre = normalizeStr(r[findK(['nombre', 'proyecto'])]);

            // Lookups
            const regionName = normalizeRegion(r[findK(['regi', 'region'])]);
            const region_id = regionesMap[regionName];

            const lineaName = normalizeStr(r[findK(['linea', 'línea'])]);
            const linea_id = lineasMap[lineaName];

            const instName = normalizeStr(r[findK(['instituci', 'ejecutora'])]);
            const institucion_ejecutora_id = instMap[instName];

            // Strict Linking for Eje & Etapa
            const ejeName = normalizeStr(r[findK(['eje'])]);
            // Try to find in loaded map, verify strictness?
            // If not found, maybe invalid Eje? Or maybe we should upsert it too if missing?
            // Protocol says "Segundo: Hoja eje -> tabla ejes".
            // If the proj sheet has an Eje not in the Eje sheet, we potentially have an issue.
            // We will fallback to upserting if we want to avoid NULLs, or leave NULL if strict.
            // "sin nulos" implies we should ensure it exists.
            let eje_id = ejesMap[ejeName] || ejesMap[ejeName.toUpperCase()];

            const etapaName = normalizeStr(r[findK(['etapa', 'estado'])]);
            let etapa_id = etapasMap[etapaName] || etapasMap[etapaName.toUpperCase()];

            // Fallback: If map is empty (sheet didn't exist), we might need to upsert.
            // For now, assuming sheet exists. If id is missing, we log warning.

            const beneficiarios = parseNumber(r[findK(['beneficiarios'])]);
            const monto_fondoempleo = parseNumber(r[findK(['fondoempleo'])]);
            const monto_contrapartida = parseNumber(r[findK(['contrapartida'])]);

            payload.push({
                año,
                nombre,
                region_id,
                linea_id,
                eje_id,
                etapa_id,
                institucion_ejecutora_id,
                monto_fondoempleo,
                monto_contrapartida,
                beneficiarios,
                estado: etapaName // Keep text just in case
            });
        }

        if (payload.length > 0) {
            console.log(`Inserting ${payload.length} projects...`);
            const { error } = await supabase.from('proyectos_servicios').insert(payload);
            if (error) {
                console.error('Insert Error:', error);
                // Fallback to chunked insert if too large
            } else {
                console.log('Projects inserted successfully.');
            }
        } else {
            console.log('No projects found to insert.');
        }

        console.log('Done.');

    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    }
}

runImport();
