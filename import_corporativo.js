
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Faltan credenciales de Supabase en .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importCorporativo() {
    try {
        console.log('--- Iniciando Importación Corporativo (Finanzas y Aportantes) ---');
        const excelPath = path.resolve('sist.xlsx');
        const workbook = XLSX.readFile(excelPath);

        // 1. Transformación Hoja 'finanzas'
        console.log('Procesando hoja finanzas...');
        const finanzasSheet = workbook.Sheets['finanzas'];
        const finanzasData = XLSX.utils.sheet_to_json(finanzasSheet);

        const finanzasInsert = [];
        const rubros = ['Aportes  ', 'Intereses', 'G. Operativos', 'Proyectos', 'Becas', 'Saldos en Bancos'];

        for (const row of finanzasData) {
            let añoRaw = row['Año'];
            if (!añoRaw) continue;

            // Limpiar año '2025*' -> 2025
            let año = parseInt(String(añoRaw).replace('*', ''));

            for (const rubro of rubros) {
                const monto = row[rubro];
                if (monto !== undefined && monto !== null) {
                    finanzasInsert.push({
                        año: año,
                        rubro: rubro.trim(),
                        monto: parseFloat(monto)
                    });
                }
            }
        }

        // 2. Transformación Hoja 'aportantes'
        console.log('Procesando hoja aportantes...');
        const aportantesSheet = workbook.Sheets['aportantes'];
        const aportantesData = XLSX.utils.sheet_to_json(aportantesSheet);

        const aportantesInsert = [];
        const añosAportantes = [2021, 2022, 2023, 2024, 2025];

        for (const row of aportantesData) {
            const empresa = row['EMPRESA'];
            if (!empresa) continue;

            for (const año of añosAportantes) {
                const monto = row[año];
                if (monto !== undefined && monto !== null && monto !== '') {
                    aportantesInsert.push({
                        año: año,
                        empresa: empresa,
                        monto: parseFloat(monto)
                    });
                }
            }
        }

        // 3. Insertar en Supabase
        console.log(`Borrando datos previos (limpieza selectiva)...`);
        await supabase.from('finanzas_anual').delete().neq('id', 0);
        await supabase.from('aportantes_anual').delete().neq('id', 0);

        console.log(`Insertando ${finanzasInsert.length} filas en finanzas_anual...`);
        const { error: fErr } = await supabase.from('finanzas_anual').insert(finanzasInsert);
        if (fErr) throw fErr;

        console.log(`Insertando ${aportantesInsert.length} filas en aportantes_anual...`);
        const { error: aErr } = await supabase.from('aportantes_anual').insert(aportantesInsert);
        if (aErr) throw aErr;

        console.log('Importación Corporativo completada con éxito.');

    } catch (err) {
        console.error('Error en ETL Corporativo:', err.message);
    }
}

importCorporativo();
