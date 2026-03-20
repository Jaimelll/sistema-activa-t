const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const excelPath = 'c:\\trabajo\\fondo\\beca_nuevas.xlsx';

async function migrate() {
    console.log('--- Iniciando Migración Final de Becas ---');
    
    // 1. Cargar Excel
    const workbook = XLSX.readFile(excelPath);
    const becaSheet = XLSX.utils.sheet_to_json(workbook.Sheets['beca']);
    
    // 2. Poblar Catálogos
    const catalogs = {
        institucion: { sheet: 'institucion', col: 'descripcion' },
        condicion: { sheet: 'condicion', col: 'descripcion' },
        formato: { sheet: 'formato', col: 'descripcion' },
        naturaleza_ie: { sheet: 'naturaleza_IE', col: 'Naturaleza IE' },
        tipo_estudio: { sheet: 'tipo_estudio', col: 'descripcion' },
    };

    const extraCatalogs = ['modalidades', 'regiones', 'etapas'];
    const extraCatalogMappings = {
        'modalidades': 'modalidades.descripcion',
        'regiones': 'regiones.descripcion',
        'etapas': 'estapas.descripcion'
    };

    const cache = {};

    console.log('Phase 1: Syncing Catalogs (Integer ID mode)...');
    
    for (const [table, info] of Object.entries(catalogs)) {
        console.log(`Syncing ${table}...`);
        const sheet = workbook.Sheets[info.sheet];
        const rows = sheet ? XLSX.utils.sheet_to_json(sheet) : [];
        
        // Map current from DB
        const { data: existing } = await supabase.from(table).select('id, descripcion');
        const map = Object.fromEntries((existing || []).map(r => [r.descripcion, r.id]));
        let maxId = Math.max(0, ...(existing || []).map(r => r.id));

        // Sync from Excel Sheet
        for (const row of rows) {
            const desc = row[info.col] || row['descripcion'] || row['Naturaleza IE'];
            if (desc && !map[desc]) {
                const id = row.id || ++maxId;
                const { data, error } = await supabase.from(table).insert({ id, descripcion: desc }).select().single();
                if (error) console.error(`Error in ${table}: ${error.message}`);
                else map[desc] = data.id;
                maxId = Math.max(maxId, id);
            }
        }

        // Add from Main Sheet unique values
        const mainCol = Object.keys(becaSheet[0]).find(k => k.toLowerCase().includes(table.toLowerCase().replace('_ie', '')));
        if (mainCol) {
            const values = [...new Set(becaSheet.map(r => r[mainCol]).filter(v => v))];
            for (const v of values) {
                if (!map[v]) {
                    const id = ++maxId;
                    const { data, error } = await supabase.from(table).insert({ id, descripcion: v }).select().single();
                    if (error) console.error(`Error auto-sync ${table}: ${error.message}`);
                    else map[v] = data.id;
                }
            }
        }
        cache[table] = map;
    }

    for (const table of extraCatalogs) {
        console.log(`Syncing ${table}...`);
        const { data: existing } = await supabase.from(table).select('id, descripcion');
        const map = Object.fromEntries((existing || []).map(r => [r.descripcion, r.id]));
        let maxId = Math.max(0, ...(existing || []).map(r => r.id));

        const colName = extraCatalogMappings[table];
        const values = [...new Set(becaSheet.map(r => r[colName]).filter(v => v))];
        for (const v of values) {
            if (!map[v]) {
                const id = ++maxId;
                const { data, error } = await supabase.from(table).insert({ id, descripcion: v }).select().single();
                if (error) console.error(`Error in extra ${table}: ${error.message}`);
                else map[v] = data.id;
            }
        }
        cache[table] = map;
    }

    console.log('Phase 2: Migrating Main Data (becas_nueva)...');
    
    // Clear old data if any (User said "Migrar", usually implies clean start for "nueva")
    // await supabase.from('becas_nueva').delete().neq('id', 0); // Risky if not requested, I'll skip delete.

    const batchSize = 100;
    for (let i = 0; i < becaSheet.length; i += batchSize) {
        const batch = becaSheet.slice(i, i + batchSize);
        const records = [];

        for (const row of batch) {
            records.push({
                periodo: parseInt(row['periodo']),
                eje_id: parseInt(row['eje_id']),
                linea_id: parseInt(row['línea_id']),
                nombre: row['nombre '] || row['nombre'],
                documento: row['documento'] ? row['documento'].toString() : null,
                institucion_id: cache.institucion[row['institución.descripcion']] || null,
                modalidad_id: cache.modalidades[row['modalidades.descripcion']] || null,
                region_id: cache.regiones[row['regiones.descripcion']] || null,
                beneficiarios: parseInt(row['cantidad de beneficiarios']) || 0,
                presupuesto: parseFloat(row['fondoempleo ']) || 0,
                avance: parseFloat(row['Avance']) || 0,
                etapa_id: cache.etapas[row['estapas.descripcion']] || null,
                provincia_procedencia: row['Provincia procedencia'],
                distrito_procedencia: row['Distrito procedencia'],
                edad: parseInt(row['Edad']),
                tipo_estudio_id: cache.tipo_estudio[row['tipo_estudio.descripcion']] || null,
                naturaleza_ie_id: cache.naturaleza_ie[row['Naturaleza IE']] || null,
                especialidad: row['Especialidad'],
                formato_id: cache.formato[row['formato.descripcion']] || null,
                condicion_id: cache.condicion[row['condicion.descripcion']] || null,
                duracion_meses: parseInt(row['duracion_meses'])
            });
        }

        const { error } = await supabase.from('becas_nueva').insert(records);
        if (error) {
            console.error(`Error en lote ${i/batchSize + 1}:`, error.message);
        } else {
            console.log(`Lote ${i/batchSize + 1} completado (${records.length} registros)`);
        }
    }

    console.log('--- Migración Finalizada ---');
}

migrate().catch(console.error);
