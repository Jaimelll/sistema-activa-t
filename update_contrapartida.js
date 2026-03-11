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

async function updateContrapartida() {
    try {
        console.log('--- Iniciando Actualización Atómica de Contrapartida ---');

        // 1. Leer Excel (Ubicación: raíz del proyecto)
        const excelPath = path.resolve('avance0403.xlsx');
        console.log(`Leyendo archivo: ${excelPath}`);

        if (!require('fs').existsSync(excelPath)) {
            throw new Error(`Archivo no encontrado en: ${excelPath}`);
        }

        const workbook = XLSX.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`Registros detectados en Excel: ${data.length}`);

        // 2. Conteo de Seguridad
        if (data.length !== 56) {
            console.warn(`ADVERTENCIA: Se esperaban 56 registros, pero se detectaron ${data.length}.`);
            // No detenemos forzosamente si el usuario permite variaciones mínimas, 
            // pero el requerimiento dice "detenerse o informar". Informamos claramente.
        }

        // 3. Selección de IDs existentes (para validar)
        const { data: dbIds, error: dbError } = await supabase
            .from('proyectos_servicios')
            .select('id');

        if (dbError) throw dbError;
        const validIds = new Set(dbIds.map(p => p.id));

        // 4. Procesamiento Fila por Fila (Protocolo Atómico)
        let processedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const row of data) {
            const id = row.id;
            const monto = row.monto_contrapartida;

            if (!id || monto === undefined || monto === null) {
                console.log(`Fila omitida (ID o monto nulo): ${JSON.stringify(row)}`);
                skippedCount++;
                continue;
            }

            if (!validIds.has(id)) {
                console.log(`ID ${id} no encontrado en la base de datos. Omitiendo.`);
                skippedCount++;
                continue;
            }

            // UPDATE Selectivo
            const { error: updateError } = await supabase
                .from('proyectos_servicios')
                .update({ monto_contrapartida: monto })
                .eq('id', id);

            if (updateError) {
                console.error(`Error actualizando ID ${id}:`, updateError.message);
                errorCount++;
            } else {
                processedCount++;
                if (processedCount % 10 === 0) {
                    process.stdout.write(`${processedCount}... `);
                }
            }
        }

        console.log('\n--- Resumen de Ejecución ---');
        console.log(`Registros actualizados exitosamente: ${processedCount}`);
        console.log(`Registros omitidos/no encontrados: ${skippedCount}`);
        console.log(`Errores encontrados: ${errorCount}`);

        if (processedCount === 56) {
            console.log('ÉXITO: Se procesaron exactamente los 56 registros esperados.');
        } else {
            console.log(`COMPLETADO: Se procesaron ${processedCount} de 56 esperados.`);
        }

    } catch (err) {
        console.error('Error Fatal:', err.message);
        process.exit(1);
    }
}

updateContrapartida();
