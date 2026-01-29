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
        for (const row of rows) {
            // MAPPING
            // Institucion
            const nombreInst = row['Razón Social'] || row['Nombre comercial'] || row['INSTITUCIÓN'];
            const correoInst = row['CORREO ELECTRÓNICO'];

            if (!nombreInst) continue;

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
                    // Maybe already exists by unique constraint race condition or name?
                    // Just fetch again
                    const { data: retryInst } = await supabase.from('instituciones').select('id').eq('nombre', nombreInst).single();
                    if (retryInst) instId = retryInst.id;
                    else console.error('Failed to create Institucion:', nombreInst, createInstError.message);
                } else {
                    instId = newInst.id;
                }
            }

            // Proyecto
            const nombreProy = row['PROYECTO'];
            const region = row['REGIÓN'];
            // Estado: Look for keys that might match
            let estado = row['SELECCIÓN FINAL'] || row['Estado'] || 'Registrado';
            // Clean state
            if (estado === 'NO SELECCIONADO') estado = 'Rechazado';
            if (estado === 'SELECCIONADO') estado = 'Aprobado';

            if (!nombreProy) continue;

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
            const proyId = proyData.id;

            // Metricas
            // Keys from inspection: "Monto Financiado por FE", "Contrapartida", "VAN", "TIR", "N° de beneficiarios"
            const montoFE = parseFloat(row['Monto Financiado por FE'] || 0);
            const montoContra = parseFloat(row['Contrapartida'] || 0);
            const van = parseFloat(row['VAN'] || 0);
            const tir = parseFloat(row['TIR'] || 0);
            const benef = parseInt(row['N° de beneficiarios'] || 0);

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

            if (metError) console.error('Error creating metrics for:', nombreProy, metError.message);
        }

        console.log('Migration Completed.');

    } catch (e) {
        console.error('Migration Error:', e);
    }
}

migrate();
