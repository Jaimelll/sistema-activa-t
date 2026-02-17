
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

const FILE_PATH = 'c:/trabajo/fondo/Base7.xlsx';

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
    // Regex for Mmm-YY or Mmm-YYYY (e.g. Ago-25, Ene-2023)
    // Spanish months: Ene, Feb, Mar, Abr, May, Jun, Jul, Ago, Set/Sep, Oct, Nov, Dic
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
    // Handle 2-digit year (assume 20xx)
    if (yStr.length === 2) year += 2000;

    return `${year}-${months[mStr]}-01`;
}

// Helper to handle Excel dates
const excelDateToISO = (serial) => {
    if (!serial) return null;
    if (typeof serial === 'string') return serial.trim(); // Assume YYYY-MM-DD or similar
    const dateObj = xlsx.SSF.parse_date_code(serial);
    if (!dateObj) return null;
    return `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
};


async function runStrictETL() {
    console.log('--- STARTING STRICT BASE7 ETL ---');
    console.log(`File: ${FILE_PATH}`);

    const workbook = xlsx.readFile(FILE_PATH);

    // --- 1. CLEANUP ---
    console.log('\n[1/5] Truncating Transactional Tables...');

    // Delete all from avance_proyecto
    let { error: errAv } = await supabase.rpc('truncate_table', { table_name: 'avance_proyecto' });
    // If RPC doesn't exist, use delete neq 0
    if (errAv) {
        console.log('RPC truncate failed, using DELETE...');
        const { error: e1 } = await supabase.from('avance_proyecto').delete().neq('id', 0);
        if (e1) console.error('Error cleaning avance:', e1);
    }

    // Delete all from programa_proyecto
    let { error: errProg } = await supabase.rpc('truncate_table', { table_name: 'programa_proyecto' });
    if (errProg) {
        const { error: e2 } = await supabase.from('programa_proyecto').delete().neq('id', 0);
        if (e2) console.error('Error cleaning programa:', e2);
    }

    // Optional: Clean projects if we want total reconstruction, but user said "Update masters, then load projects".
    // SKILL.md says "Regla de Oro: Vínculo por ID". 
    // We will UPSERT projects, updating everything.
    console.log('Transactional tables cleaned.');


    // --- 2. MASTER TABLES (UPSERT) ---
    console.log('\n[2/5] Updating Master Tables (UPSERT)...');

    // Mappings: [SheetName, TableName, ID_Col, Desc_Col, Extra_Col_Map]
    const masterConfig = [
        { sheet: 'eje', table: 'ejes', id: 'Numero', desc: 'descripcion', extra: {} },
        { sheet: 'linea', table: 'lineas', id: 'Numero', desc: 'descripcion', extra: {} },
        { sheet: 'región', table: 'regiones', id: 'Numero', desc: 'descripcion', extra: {} },
        { sheet: 'modalidad de ejecución', table: 'modalidades', id: 'Numero', desc: 'descripcion', extra: {} },
        { sheet: 'etapa', table: 'etapas', id: 'Numero', desc: 'descripcion', extra: {} },
    ];

    const masterMaps = {}; // Store { 'ejes': { 'name_key': id }, ... }

    for (const cfg of masterConfig) {
        if (!workbook.Sheets[cfg.sheet]) {
            console.error(`Missing Master Sheet: ${cfg.sheet}`);
            continue;
        }
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[cfg.sheet]);
        const header = rows[0] ? Object.keys(rows[0]) : [];

        console.log(`Processing ${cfg.table} (${rows.length} rows)...`);

        // Prepare Map
        masterMaps[cfg.table] = {};

        for (const row of rows) {
            // Find ID col
            let idVal = row[cfg.id] || row['id'] || row['ID'];
            if (!idVal && idVal !== 0) continue;

            // Find Desc col
            let descVal = row[cfg.desc] || row['nombre'] || row['Descripcion'];

            // STRICT RULE: ID 2 = Lanzamiento
            if (cfg.table === 'etapas' && idVal == 2) {
                descVal = 'Lanzamiento';
            }

            if (descVal) {
                // Upsert
                const payload = { id: idVal, descripcion: descVal };
                // Add extras
                for (const [dbCol, sourceCol] of Object.entries(cfg.extra)) {
                    payload[dbCol] = descVal; // Usually map description to name/modalidad
                }

                const { error } = await supabase.from(cfg.table).upsert(payload);
                if (error) console.error(`Error upsert ${cfg.table} ${idVal}:`, error.message);

                // Add to Map
                masterMaps[cfg.table][cleanNameStrict(descVal)] = idVal;
            }
        }
    }

    // --- 3. PROYECTOS (ID LINKING) ---
    console.log('\n[3/5] Processing Proyectos & Servicios...');
    const mainSheet = 'proyecto_servicio';
    if (!workbook.Sheets[mainSheet]) throw new Error(`Sheet ${mainSheet} missing!`);

    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[mainSheet], { header: 1 });
    const headers = rawData[0];
    const dataRows = rawData.slice(1);

    // Column Indices
    const getIdx = (patterns) => headers.findIndex(h => h && patterns.some(p => h.trim().toLowerCase() === p.toLowerCase()));

    // Log headers to debug if needed
    // console.log('Headers:', headers);

    // STRICT MAPPING:
    // nombre DB <== 'nombre proyecto o servicio'
    // beneficiarios DB <== 'cantidad de beneficiarios'
    // estado DB <== 'etapa' (Lookup ID in Stages)

    const idxNum = getIdx(['Numero', 'N°', 'N', 'No']);

    // Strict Name Mapping
    const idxNom = getIdx(['nombre proyecto o servicio', 'nombre del proyecto', 'nombre']);

    const idxCod = getIdx(['Codigo', 'Código', 'Código del proyecto']);
    const idxEje = getIdx(['Eje', 'Eje_id']);
    const idxLin = getIdx(['Linea', 'Linea de intervencion', 'Línea']);
    const idxReg = getIdx(['Region', 'Región']);
    const idxMod = getIdx(['Modalidad', 'Modalidad de ejecución']);

    // Strict Status/Stage Mapping
    const idxEta = getIdx(['Etapa', 'Etapa_id']);

    const idxInst = getIdx(['Institución Ejecutora', 'Generadora']);
    const idxGest = getIdx(['Gestora']);

    // Strict Beneficiaries Mapping
    const idxBen = getIdx(['cantidad de beneficiarios', 'beneficiarios', 'Total Beneficiarios']);

    const idxFondo = getIdx(['Monto Fondoempleo', 'Fondoempleo']);
    const idxContra = getIdx(['Monto Contrapartida', 'Contrapartida']);
    const idxAno = getIdx(['Año', 'Periodo']);

    if (idxNum === -1) throw new Error("Critical: 'Numero' column not found!");

    let projCount = 0;

    // Helper to find ID from map
    const findMasterId = (tableName, val, defaultVal) => {
        if (!val) return defaultVal || null;
        const cleaned = cleanNameStrict(val);
        if (masterMaps[tableName] && masterMaps[tableName][cleaned]) {
            return masterMaps[tableName][cleaned];
        }
        if (typeof val === 'number') return val;
        return null;
    };

    // Prepare Institution Map (Load existing)
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

    const projectsToUpsert = [];

    for (const row of dataRows) {
        const id = row[idxNum];
        if (!id) continue;

        const nombre = row[idxNom] || 'Sin Nombre';

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

        // Strict: Estado debe venir de 'etapa'. 
        // If 'etapa' is 'Lanzamiento' (ID 2), we want 'Lanzamiento' in 'estado' column? 
        // Or if 'estado' column is FK, we want ID. 
        // Previous script used 'estado' column from Excel. 
        // User says: "El campo estado en la DB debe venir de la columna 'etapa' del Excel. ... Si es FK, busca el ID."
        // Let's assume 'estado' in DB is text (status string). 
        // If row[idxEta] is 'Lanzamiento', estado = 'Lanzamiento'.
        // If DB schema differs, we might need to adjust, but typically 'estado' is text.
        // Wait, 'etapa_id' is already linked to row[idxEta].
        // If 'estado' is just a text copy of stage name:
        let estadoVal = row[idxEta]; // Use Etapa column for Estado

        // Ensure beneficiarios from specific column
        const beneficiarios = row[idxBen] || 0;

        projectsToUpsert.push({
            id: id,
            nombre: nombre,
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
            beneficiarios: beneficiarios,
            estado: estadoVal // Zero Nulls logic: assigns 'etapa' string/value to 'estado'
        });
    }

    // Upsert Projects Batch
    const { error: projErr } = await supabase.from('proyectos_servicios').upsert(projectsToUpsert);
    if (projErr) console.error('Error upserting projects:', projErr.message);
    else console.log(`Upserted ${projectsToUpsert.length} projects.`);


    // --- 4. ADVANCES (RECONSTRUCTION) ---
    console.log('\n[4/5] Reconstructing Advances...');

    // Map column headers to Stage IDs
    // 1: Bases, 2: Lanzamiento (Actos Previos in Excel), 3: Consejo, 4: Convenio, 5: Ejecución, 6: Ejecutado
    // We need to find valid columns in headers
    const stageMapping = [
        { id: 1, patterns: ['Aprobación de bases', 'Bases'] },
        { id: 2, patterns: ['Lanzamiento', 'Actos Previos'] }, // Map Actos Previos -> ID 2
        { id: 3, patterns: ['Aprobación de consejo', 'Consejo'] },
        { id: 4, patterns: ['Firma convenio', 'Convenio'] },
        { id: 5, patterns: ['En ejecución', 'Inicio obra'] },
        { id: 6, patterns: ['Ejecutado', 'Fin de obra'] }, // Stage 6 mapping
    ];

    const advanceRecords = [];

    for (const row of dataRows) {
        const pid = row[idxNum];
        if (!pid) continue;

        for (const stage of stageMapping) {
            // Find col index
            const cIdx = getIdx(stage.patterns);
            if (cIdx !== -1) {
                const dateVal = excelDateToISO(row[cIdx]);
                if (dateVal) {
                    advanceRecords.push({
                        proyecto_id: pid,
                        etapa_id: stage.id,
                        fecha: dateVal,
                        sustento: 'Carga Base7 Strict'
                    });
                }
            }
        }
    }

    // Insert Advances
    if (advanceRecords.length > 0) {
        const { error: advErr } = await supabase.from('avance_proyecto').insert(advanceRecords);
        if (advErr) console.error('Error inserting advances:', advErr.message);
        else console.log(`Inserted ${advanceRecords.length} advance records.`);
    }


    // --- 5. PROGRAM (UNIVERSAL DATE) ---
    console.log('\n[5/5] Reconstructing Program (Universal Dates)...');

    const programRecords = [];

    // Identify Date Columns
    const dateCols = [];
    headers.forEach((h, i) => {
        const parsed = parseDateHeader(h);
        if (parsed) {
            dateCols.push({ idx: i, date: parsed, header: h });
        }
    });

    console.log(`Identified ${dateCols.length} month-columns (Universal Pattern).`);

    for (const row of dataRows) {
        const pid = row[idxNum];
        if (!pid) continue;

        for (const col of dateCols) {
            const val = row[col.idx];
            // Check > 0
            const money = parseMoney(val);
            if (money > 0) {
                programRecords.push({
                    proyecto_id: pid,
                    fecha: col.date,
                    monto: money
                });
            }
        }
    }

    // Insert Program Batches
    if (programRecords.length > 0) {
        const BATCH = 2000;
        let pCount = 0;
        for (let i = 0; i < programRecords.length; i += BATCH) {
            const batch = programRecords.slice(i, i + BATCH);
            const { error: pErr } = await supabase.from('programa_proyecto').insert(batch);
            if (pErr) console.error(`Batch Program Error:`, pErr.message);
            else pCount += batch.length;
        }
        console.log(`Inserted ${pCount} program records.`);
    }

    console.log('\n--- STRICT ETL COMPLETE ---');
}

runStrictETL().catch(e => console.error(e));
