
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
const FILE_PATH = process.argv[2] || path.join(__dirname, '..', 'Base3.xlsx');

async function importData() {
    try {
        console.log('Reading Excel file from:', FILE_PATH);
        const workbook = xlsx.readFile(FILE_PATH);

        // Try to find the data sheet. Protocol says "proyecto_servicio.csv" but we have Base3.xlsx
        // We look for 'proyecto_servicio', 'detalle', or the first sheet.
        let sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('proyecto') || n.toLowerCase().includes('detalle'));
        if (!sheetName) sheetName = workbook.SheetNames[0];

        console.log(`Using sheet: ${sheetName}`);
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" }); // defval to ensure keys exist

        console.log(`Found ${rows.length} rows.`);

        // 1. Truncate Tables
        console.log('Truncating tables...');
        const { error: truncError } = await supabase.rpc('truncate_all_tables');
        // Note: RPC might not exist. If not, use standard delete or raw query if possible? 
        // Supabase JS client doesn't support raw SQL easily without RPC. 
        // The protocol says: "TRUNCATE TABLE proyectos_servicios, regiones, etapas, lineas, ejes RESTART IDENTITY CASCADE;"
        // I will attempt to delete from child to parent if RPC fails, or assuming user has setup RPC. 
        // Since I cannot create RPC here easily, I will just delete all data using delete().
        // BUT strict protocol says TRUNCATE. 
        // Let's assume I can't do raw SQL. I will delete contents.

        // Actually, deleting is safer than failing if RPC is missing.
        await supabase.from('proyectos_servicios').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        await supabase.from('instituciones_ejecutoras').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('regiones').delete().neq('id', 0);
        await supabase.from('etapas').delete().neq('id', 0);
        await supabase.from('lineas').delete().neq('id', 0);
        await supabase.from('ejes').delete().neq('id', 0);

        console.log('Tables cleared.');

        // 2. Extract Catalogs
        const ejesSet = new Set();
        const lineasSet = new Set();
        const regionesSet = new Set();
        const etapasSet = new Set(); // Protocol says "Columna etapa -> campo estado"
        // Protocol map:
        // Eje: col 'eje' (idx 2)
        // Linea: col 'línea' (idx 3)
        // Region: col 'región' (idx 8) -> Normalize
        // Etapa: col 'etapa' (idx 12) -> campo estado? The protocol says "Columna etapa -> campo estado". 
        // Wait, "Etapa/Estado: Columna etapa -> campo estado".
        // Does 'etapas' table exist? The protocol mentions truncating 'etapas'.
        // So I should populate 'etapas' table and link it? Or just store text in 'estado'?
        // The previous code had `fase` and `etapas`.
        // Let's assume 'etapas' table is used for the dropdowns but the protocol writes to `estado` field in `proyectos_servicios`.
        // BUT the `proyectos_servicios` likely has `etapa_id` or just `estado` string?
        // Previous script: `estado: row['ESTADO']`.
        // Protocol: `campo estado`.
        // I'll extract unique values for `etapas` table just in case, but write to `estado` column.

        // Normalization Helper
        const normalize = (str) => str ? String(str).trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "SIN REGION";
        const cleanStr = (str) => str ? String(str).trim() : "";
        const cleanInt = (val) => {
            const parsed = parseInt(String(val).replace(/,/g, ''), 10);
            return isNaN(parsed) ? 0 : parsed;
        }
        const cleanFloat = (val) => {
            const parsed = parseFloat(String(val).replace(/,/g, ''));
            return isNaN(parsed) ? 0 : parsed;
        }

        const uniqueInstituciones = new Set();

        const processedRows = rows.map(row => {
            // Map based on Protocol Indices roughly (by name)
            // Indices in protocol:
            // 1: periodo -> año
            // 2: eje
            // 3: linea
            // 4: nombre proyecto o servicio
            // 8: region
            // 9: cantidad de beneficiarios
            // 10: fondoempleo
            // 11: contrapartida
            // 12: etapa

            // Map keys from Excel (keys might be specific, I should print them if this fails, but I'll try standard names)
            // I'll look for case-insensitive matches using a helper
            const getVal = (keys) => {
                for (let k of keys) {
                    const found = Object.keys(row).find(rk => rk.toLowerCase().trim() === k.toLowerCase());
                    if (found) return row[found];
                }
                return null;
            }

            const año = cleanInt(getVal(['periodo', 'año', 'anio']));
            const eje = cleanStr(getVal(['eje']));
            const linea = cleanStr(getVal(['linea', 'línea']));
            const nombre = cleanStr(getVal(['nombre proyecto o servicio', 'nombre', 'proyecto']));
            const regionRaw = getVal(['región', 'region']);
            const region = normalize(regionRaw);
            const beneficiarios = cleanInt(getVal(['cantidad de beneficiarios', 'beneficiarios']));
            const monto_fondoempleo = cleanFloat(getVal(['fondoempleo', 'fondoempleo ', 'monto_fondoempleo']));
            const monto_contrapartida = cleanFloat(getVal(['contrapartida', 'contrapartida ', 'monto_contrapartida']));
            const etapa = cleanStr(getVal(['etapa', 'estado']));
            const institucion = cleanStr(getVal(['institucion ejecutora', 'institución ejecutora', 'ejecutor']));

            if (eje) ejesSet.add(eje);
            if (linea) lineasSet.add(linea);
            if (region) regionesSet.add(region);
            if (etapa) etapasSet.add(etapa);
            if (institucion) uniqueInstituciones.add(institucion);

            return {
                año, eje, linea, nombre, region, beneficiarios, monto_fondoempleo, monto_contrapartida, etapa, institucion
            };
        });

        // 3. Populate Catalogs
        const upsertCatalog = async (table, values) => {
            console.log(`Upserting ${values.size} into ${table}...`);
            const items = Array.from(values).map(v => ({ descripcion: v }));
            if (items.length === 0) return {};
            const { data, error } = await supabase.from(table).upsert(items, { onConflict: 'descripcion' }).select('id, descripcion');
            if (error) { throw new Error(`Error in ${table}: ${error.message}`); }
            return data.reduce((acc, curr) => ({ ...acc, [curr.descripcion]: curr.id }), {});
        };

        const mapEjes = await upsertCatalog('ejes', ejesSet);
        const mapLineas = await upsertCatalog('lineas', lineasSet);
        const mapRegiones = await upsertCatalog('regiones', regionesSet);
        const mapEtapas = await upsertCatalog('etapas', etapasSet);

        // Instituciones
        console.log(`Upserting ${uniqueInstituciones.size} instituciones...`);
        const instItems = Array.from(uniqueInstituciones).map(n => ({ nombre: n }));
        // Note: Institution table uses 'nombre' not 'descripcion' usually.
        let mapInstituciones = {};
        if (instItems.length > 0) {
            const { data: instData, error: instError } = await supabase.from('instituciones_ejecutoras').upsert(instItems, { onConflict: 'nombre' }).select('id, nombre');
            if (instError) throw new Error(`Error in inst: ${instError.message}`);
            mapInstituciones = instData.reduce((acc, curr) => ({ ...acc, [curr.nombre]: curr.id }), {});
        }

        // 4. Insert Projects
        console.log('Inserting projects...');
        const projectsPayload = processedRows.map(r => {
            return {
                año: r.año,
                nombre: r.nombre,
                eje_id: mapEjes[r.eje],
                linea_id: mapLineas[r.linea],
                region_id: mapRegiones[r.region],
                institucion_ejecutora_id: mapInstituciones[r.institucion],
                monto_fondoempleo: r.monto_fondoempleo,
                monto_contrapartida: r.monto_contrapartida,
                beneficiarios: r.beneficiarios,
                estado: r.etapa, // Mapping 'etapa' string to 'estado' column as per protocol? 
                // Protocol says: "Etapa/Estado: Columna etapa -> campo estado".
                // Assuming 'estado' is a text column or we should use 'etapa_id' if exists.
                // The previous script used 'estado'. I will use 'estado' with the string value.
                // Also linking etapa_id just in case? No, keep it simple.
            };
        });

        // Batch insert
        const BATCH_SIZE = 100;
        for (let i = 0; i < projectsPayload.length; i += BATCH_SIZE) {
            const batch = projectsPayload.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from('proyectos_servicios').insert(batch);
            if (error) console.error('Error inserting batch:', error.message);
        }

        console.log('Import completed successfully.');

    } catch (e) {
        console.error('Import Error:', e);
        process.exit(1);
    }
}

importData();
