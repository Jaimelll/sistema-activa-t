
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('CRITICAL: Missing Supabase Service Key or URL');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
});

const FILE_PATH = path.resolve(__dirname, '../Base7.xlsx');

// --- Helpers ---
const normNum = (val) => {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'string' && val.trim() === '') return null;
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
};

const cleanText = (txt) => {
    if (!txt) return '';
    return txt.toString().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const cleanNameStrict = (txt) => {
    if (!txt) return '';
    return txt.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const parseMoney = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    let s = val.toString().replace(/,/g, '');
    s = s.replace(/[^\d.-]/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
};

// Universal Date Parser: MMM-YY or MMM-YYYY
const parseDateHeader = (header) => {
    if (!header || typeof header !== 'string') return null;
    const clean = header.replace(/\u2013|\u2014/g, '-').trim();
    const parts = clean.split('-');
    if (parts.length !== 2) return null;

    let mStr = parts[0].toLowerCase();
    let yStr = parts[1];

    const months = {
        'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'ago': '08', 'sep': '09', 'set': '09', 'oct': '10', 'nov': '11', 'dic': '12'
    };

    if (!months[mStr]) return null;

    let year = parseInt(yStr, 10);
    if (yStr.length === 2) year += 2000;

    return `${year}-${months[mStr]}-01`;
}

const excelDateToISO = (serial) => {
    if (!serial) return null;
    if (typeof serial === 'string') return serial.trim();
    const dateObj = xlsx.SSF.parse_date_code(serial);
    if (!dateObj) return null;
    return `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
};

async function runStrictETL() {
    console.log('--- STARTING STRICT BASE7 ETL (INCL. BECAS) ---');
    console.log(`File: ${FILE_PATH}`);

    const workbook = xlsx.readFile(FILE_PATH);

    // --- 1. CLEANUP ---
    console.log('\n[1/6] Cleaning Transactional Tables...');

    // Helper to truncate/delete
    const cleanTable = async (table) => {
        let { error } = await supabase.rpc('truncate_table', { table_name: table });
        if (error) {
            console.log(`RPC truncate ${table} failed (${error.message}), using DELETE...`);
            const { error: errDel } = await supabase.from(table).delete().neq('id', 0);
            if (errDel) console.error(`Error deleting ${table}:`, errDel.message);
        }
    };

    await cleanTable('avance_proyecto');
    await cleanTable('programa_proyecto');
    // We do NOT truncate projects or becas here if we want Upsert safety, 
    // BUT usually for a clean load we might want to, OR we rely on Upsert to overwrite.
    // Given the strict ID requirement, Upsert is fine.

    // --- 2. MASTER TABLES (UPSERT) ---
    console.log('\n[2/6] Updating Master Tables (UPSERT)...');

    const masterConfig = [
        { sheet: 'eje', table: 'ejes', id: 'Numero', desc: 'descripcion', extra: {} },
        { sheet: 'linea', table: 'lineas', id: 'Numero', desc: 'descripcion', extra: {} },
        { sheet: 'región', table: 'regiones', id: 'Numero', desc: 'descripcion', extra: {} },
        { sheet: 'modalidad de ejecución', table: 'modalidades', id: 'Numero', desc: 'descripcion', extra: {} },
        { sheet: 'etapa', table: 'etapas', id: 'Numero', desc: 'descripcion', extra: {} },
    ];

    const masterMaps = {};

    for (const cfg of masterConfig) {
        if (!workbook.Sheets[cfg.sheet]) {
            console.error(`Missing Master Sheet: ${cfg.sheet}`);
            continue;
        }
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[cfg.sheet]);
        masterMaps[cfg.table] = {};

        for (const row of rows) {
            let idVal = row[cfg.id] || row['id'] || row['ID'];
            if (!idVal && idVal !== 0) continue;

            let descVal = row[cfg.desc] || row['nombre'] || row['Descripcion'];

            // STRICT RULE: ID 2 = Lanzamiento
            if (cfg.table === 'etapas' && idVal == 2) {
                descVal = 'Lanzamiento';
            }

            if (descVal) {
                const payload = { id: idVal, descripcion: descVal };
                // Add extras if needed
                for (const [dbCol, sourceCol] of Object.entries(cfg.extra)) {
                    payload[dbCol] = descVal;
                }

                const { error } = await supabase.from(cfg.table).upsert(payload);
                if (error) console.error(`Error upsert ${cfg.table} ${idVal}:`, error.message);

                masterMaps[cfg.table][cleanNameStrict(descVal)] = idVal;
            }
        }
    }

    // Helper: Find Logic
    const findMasterId = (tableName, val, defaultVal) => {
        if (!val) return defaultVal || null;
        const cleaned = cleanNameStrict(val);
        if (masterMaps[tableName] && masterMaps[tableName][cleaned]) {
            return masterMaps[tableName][cleaned];
        }
        if (typeof val === 'number') return val;
        return null;
    };

    // Helper: Inst logic
    const instMap = {};
    const { data: instData } = await supabase.from('instituciones_ejecutoras').select('id, nombre');
    if (instData) instData.forEach(i => instMap[cleanNameStrict(i.nombre)] = i.id);

    async function getOrCreateInst(name) {
        if (!name) return null;
        const clean = cleanNameStrict(name);
        if (instMap[clean]) return instMap[clean];
        const { data, error } = await supabase.from('instituciones_ejecutoras').insert({ nombre: name }).select().single();
        if (data) {
            instMap[clean] = data.id;
            return data.id;
        }
        return null;
    }

    // --- 3. PROYECTOS (ID LINKING) ---
    console.log('\n[3/6] Processing Proyectos & Servicios...');
    const mainSheet = 'proyecto_servicio';
    if (workbook.Sheets[mainSheet]) {
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[mainSheet], { header: 1 });
        const headers = rawData[0];
        const dataRows = rawData.slice(1);

        const getIdx = (patterns) => headers.findIndex(h => h && patterns.some(p => h.trim().toLowerCase() === p.toLowerCase()));

        const idxNum = getIdx(['Numero', 'N°', 'N', 'No']);
        const idxNom = getIdx(['nombre proyecto o servicio', 'nombre del proyecto', 'nombre']);
        const idxCod = getIdx(['Codigo', 'Código']);
        const idxEje = getIdx(['Eje', 'Eje_id']);
        // Fix: Add 'línea' with accent
        const idxLin = getIdx(['Linea', 'Línea', 'línea', 'linea', 'Linea de intervencion']);
        const idxReg = getIdx(['Region', 'Región']);
        // Fix: Add 'modalidad de ejecución'
        const idxMod = getIdx(['Modalidad', 'modalidad', 'Modalidad de ejecución', 'modalidad de ejecución']);
        const idxEta = getIdx(['Etapa', 'Etapa_id']);
        const idxInst = getIdx(['Institución Ejecutora', 'Generadora']);
        const idxGest = getIdx(['Gestora']);
        const idxBen = getIdx(['cantidad de beneficiarios', 'beneficiarios']);
        const idxFondo = getIdx(['Monto Fondoempleo', 'Fondoempleo']);
        const idxContra = getIdx(['Monto Contrapartida', 'Contrapartida']);
        const idxAno = getIdx(['Año', 'Periodo']);

        const projectsToUpsert = [];

        for (const row of dataRows) {
            const id = row[idxNum];
            if (!id && id !== 0) continue;

            // Resolve FKs
            const ejeId = findMasterId('ejes', row[idxEje], null);
            const lineaId = findMasterId('lineas', row[idxLin], null);
            const regionId = findMasterId('regiones', row[idxReg], null);
            const etapaId = findMasterId('etapas', row[idxEta], null);
            const modalidadId = findMasterId('modalidades', row[idxMod], null);
            const instId = await getOrCreateInst(row[idxInst]);

            const montoF = parseMoney(row[idxFondo]);
            const montoC = parseMoney(row[idxContra]);
            let codigo = row[idxCod];
            if (!codigo || codigo.toString().toLowerCase().includes('sin código')) {
                codigo = `PRJ-${row[idxAno] || '0000'}-${id}`;
            }

            projectsToUpsert.push({
                id: id,
                nombre: row[idxNom] || 'Sin Nombre',
                codigo_proyecto: codigo,
                año: row[idxAno] || 2024,
                eje_id: ejeId,
                linea_id: lineaId,
                region_id: regionId,
                etapa_id: etapaId,
                modalidad_id: modalidadId,
                institucion_ejecutora_id: instId,
                gestora: row[idxGest],
                monto_fondoempleo: montoF,
                monto_contrapartida: montoC,
                monto_total: montoF + montoC,
                beneficiarios: row[idxBen] || 0,
                estado: row[idxEta] // Keep excel value string as requested/fallback
            });
        }

        const { error: projErr } = await supabase.from('proyectos_servicios').upsert(projectsToUpsert);
        if (projErr) console.error('Error upserting projects:', projErr.message);
        else console.log(`Upserted ${projectsToUpsert.length} projects.`);

        // --- 4. ADVANCES ---
        console.log('\n[4/6] Reconstructing Advances...');
        const stageMapping = [
            { id: 1, patterns: ['Aprobación de bases', 'Bases'] },
            { id: 2, patterns: ['Lanzamiento', 'Actos Previos'] },
            { id: 3, patterns: ['Aprobación de consejo', 'Consejo'] },
            { id: 4, patterns: ['Firma convenio', 'Convenio'] },
            { id: 5, patterns: ['En ejecución', 'Inicio obra'] },
            { id: 6, patterns: ['Ejecutado', 'Fin de obra', 'Ejecutado.', 'Ejecutado '] },
        ];

        const advanceRecords = [];
        for (const row of dataRows) {
            const pid = row[idxNum];
            if (!pid) continue;

            for (const stage of stageMapping) {
                const cIdx = getIdx(stage.patterns);
                if (cIdx !== -1) {
                    const dateVal = excelDateToISO(row[cIdx]);
                    if (dateVal) {
                        advanceRecords.push({
                            proyecto_id: pid,
                            etapa_id: stage.id,
                            fecha: dateVal,
                            sustento: 'Carga Base7'
                        });
                    }
                }
            }
        }
        if (advanceRecords.length > 0) {
            const { error: advErr } = await supabase.from('avance_proyecto').insert(advanceRecords);
            if (advErr) console.error('Error inserting advances:', advErr.message);
            else console.log(`Inserted ${advanceRecords.length} advance records.`);
        }

        // --- 5. PROGRAM ---
        console.log('\n[5/6] Reconstructing Program...');
        const programRecords = [];
        const dateCols = [];
        headers.forEach((h, i) => {
            const parsed = parseDateHeader(h);
            if (parsed) dateCols.push({ idx: i, date: parsed });
        });

        console.log(`Program: Identified ${dateCols.length} date columns.`);

        for (const row of dataRows) {
            const pid = row[idxNum];
            if (!pid) continue;
            for (const col of dateCols) {
                const money = parseMoney(row[col.idx]);
                if (money > 0) {
                    programRecords.push({
                        proyecto_id: pid,
                        fecha: col.date,
                        monto: money
                    });
                }
            }
        }
        if (programRecords.length > 0) {
            const BATCH_SIZE = 2000;
            for (let i = 0; i < programRecords.length; i += BATCH_SIZE) {
                const { error } = await supabase.from('programa_proyecto').insert(programRecords.slice(i, i + BATCH_SIZE));
                if (error) console.error('Program Batch Error:', error.message);
            }
            console.log(`Inserted ${programRecords.length} program records.`);
        }
    } else {
        console.warn('Projects sheet not found!');
    }


    // --- 6. BECAS ---
    console.log('\n[6/6] Processing Becas...');
    const becaSheet = 'beca';
    if (workbook.Sheets[becaSheet]) {
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[becaSheet]);
        console.log(`Found ${rows.length} becas.`);

        const becasToUpsert = [];
        for (const row of rows) {
            // Use getVal for ID to handle 'numero' vs 'Numero'
            const idVal = normNum(getVal(row, ['Numero', 'numero', 'N°', 'id']));
            if (!idVal) continue;

            const instName = getVal(row, ['Institución Ejecutora', 'Generadora', 'institucion_ejecutora']) || 'Sin Institución';
            const instId = await getOrCreateInst(instName);

            const ejeId = findMasterId('ejes', getVal(row, ['Eje', 'eje_id', 'eje']), null);
            const lineaId = findMasterId('lineas', getVal(row, ['Linea', 'linea_id', 'línea', 'linea']), null);
            const regionId = findMasterId('regiones', getVal(row, ['Región', 'region_id', 'region']), null);
            const etapaId = findMasterId('etapas', getVal(row, ['Etapa', 'etapa_id', 'etapa']), null);

            const modId = findMasterId('modalidades', getVal(row, ['Modalidad', 'modalidad']), null);

            let codigo = getVal(row, ['Codigo', 'Código', 'codigo', 'código']);
            let anio = normNum(getVal(row, ['Año', 'periodo', 'año']));
            if (!codigo) codigo = `BECA-${anio || 2024}-${idVal}`;

            const nombre = getVal(row, ['Nombre de la Beca', 'Nombre', 'nombre proyecto o servicio', 'nombre']) || 'Sin Nombre';
            const beneficiarios = normNum(getVal(row, ['Beneficiarios', 'beneficiarios', 'cantidad de beneficiarios']));

            const fondo = parseMoney(getVal(row, ['Monto Fondoempleo', 'Monto Fondoempleo ']));
            const contra = parseMoney(getVal(row, ['Monto Contrapartida', 'Monto Contrapartida ']));

            becasToUpsert.push({
                id: idVal,
                codigo_beca: codigo,
                nombre: nombre,
                año: anio || 2024,
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
                gestora: getVal(row, ['Gestora', 'gestora']),
                estado: getVal(row, ['Etapa', 'etapa'])
            });
        }

        const { error: becaErr } = await supabase.from('becas').upsert(becasToUpsert);
        if (becaErr) console.error('Error upserting becas:', becaErr.message);
        else console.log(`Upserted ${becasToUpsert.length} becas.`);
    } else {
        console.log('No Beca sheet found.');
    }

    console.log('\n--- ETL COMPLETE ---');
}

runStrictETL().catch(e => console.error(e));
