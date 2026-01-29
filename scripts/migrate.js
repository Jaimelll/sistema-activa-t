const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
// OR just standard config if running from root, but let's be safe.
// Since I run "node scripts/migrate.js", __dirname is /scripts. ../.env is correct.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase Config');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FILE_PATH = 'c:/trabajo/fondo/ACTIVA-T BD.xlsx';

async function migrate() {
    try {
        console.log('Starting Migration...');

        // Authentication skipped - relying on Anon RLS
        /*
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'jaduran0102@gmail.com',
            password: 'pruebafondo'
        });

        if (authError) {
            console.error('Auth Failed:', authError.message);
            // return; // Try checking if RLS allows anon
        } else {
            console.log('Authenticated as:', authData.user.email);
        }
        */

        // 2. Read Excel
        const workbook = xlsx.readFile(FILE_PATH);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet); // Uses first row as keys by default

        console.log(`Found ${rows.length} rows.`);

        // 3. Process Rows
        let insertedInst = 0;
        let insertedProy = 0;
        let insertedMet = 0;

        if (rows.length > 0) {
            console.log('First Row Keys:', Object.keys(rows[0]));
        }

        for (const [index, row] of rows.entries()) {
            // MAPPING
            // Institucion
            const nombreInst = row['Nombre de la Institución:'] || row['Nombre comercial de la Institución:'] || row['INSTITUCIÓN'];
            const correoInst = row['Correo principal'];

            if (!nombreInst) {
                if (index < 5) console.log(`Skipping row ${index}: No Inst Name. Keys found: ${Object.keys(row).join(', ')}`);
                continue;
            }

            // Upsert Institucion
            let instId = null;
            const { data: instData, error: instError } = await supabase
                .from('instituciones')
                .select('id')
                .eq('nombre', nombreInst)
                .single();

            if (instData) {
                instId = instData.id;
            } else {
                const { data: newInst, error: createInstError } = await supabase
                    .from('instituciones')
                    .insert({ nombre: nombreInst, correo: correoInst })
                    .select('id')
                    .single();

                if (createInstError) {
                    const { data: retryInst } = await supabase.from('instituciones').select('id').eq('nombre', nombreInst).single();
                    if (retryInst) instId = retryInst.id;
                    else console.error('Failed to create Institucion:', nombreInst, createInstError.message);
                } else {
                    instId = newInst.id;
                    insertedInst++;
                }
            }

            // Proyecto
            const nombreProy = row['Nombre del proyecto:'];
            const region = row['Región'];
            // Estado: Look for keys that might match
            let estado = row['SELECCIÓN FINAL'] || 'Registrado';
            // Clean state
            if (estado === 'NO SELECCIONADO') estado = 'Rechazado';
            if (estado === 'SELECCIONADO') estado = 'Aprobado';

            if (!nombreProy) {
                console.log(`Row ${index}: No project name.`);
                continue;
            }

            const { data: proyData, error: proyError } = await supabase
                .from('proyectos')
                .insert({
                    nombre: nombreProy,
                    region: region,
                    estado: estado,
                    descripcion: 'Importado de Excel'
                })
                .select('id')
                .single();

            if (proyError) {
                console.error('Error creating project:', nombreProy, proyError.message);
                continue;
            }
            insertedProy++;
            const proyId = proyData.id;

            // Metricas
            // Keys: FONDOEMPLEO, Contrapartidas, BENEFICIARIOS
            const montoFE = parseFloat(row['FONDOEMPLEO'] || 0);
            const montoContra = parseFloat(row['Contrapartidas'] || 0);
            const van = 0; // Not found in recent log
            const tir = 0; // Not found
            const benef = parseInt(row['BENEFICIARIOS'] || 0);

            const { error: metError } = await supabase
                .from('metricas')
                .insert({
                    proyecto_id: proyId,
                    monto_fondoempleo: isNaN(montoFE) ? 0 : montoFE,
                    monto_contrapartida: isNaN(montoContra) ? 0 : montoContra,
                    van: isNaN(van) ? 0 : van,
                    tir: isNaN(tir) ? 0 : tir,
                    beneficiarios: isNaN(benef) ? 0 : benef
                });

            if (metError) {
                console.error('Error creating metrics for:', nombreProy, metError.message);
            } else {
                insertedMet++;
            }
        }

        console.log(`Migration Completed. Stats: Inst=${insertedInst}, Proy=${insertedProy}, Met=${insertedMet}`);

    } catch (e) {
        console.error('Migration Error:', e);
    }
}

migrate();
