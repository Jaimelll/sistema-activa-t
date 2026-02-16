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
const FILE_PATH = '/app/Base7.xlsx';

// Helper to normalize dates (Ago-25 -> 2025-08-01)
const parseDateHeader = (header) => {
    if (!header || typeof header !== 'string') return null;

    // Replace en-dash or em-dash with hyphen, and trim
    const cleanHeader = header.replace(/\u2013|\u2014/g, '-').trim();

    // Format: MMM-YY (Ago-25, Set-25, Ene-26)
    const parts = cleanHeader.split('-');
    if (parts.length !== 2) return null;

    let monthStr = parts[0].toLowerCase();
    const yearStr = parts[1];

    const months = {
        'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'ago': '08', 'sep': '09', 'set': '09', 'oct': '10', 'nov': '11', 'dic': '12'
    };

    if (!months[monthStr]) return null;

    // Assume 20xx for year
    const year = `20${yearStr}`;
    const month = months[monthStr];

    return `${year}-${month}-01`;
};

async function importProgramacion() {
    try {
        console.log('Reading Excel file from:', FILE_PATH);
        const workbook = xlsx.readFile(FILE_PATH);
        const sheetName = 'proyecto_servicio';

        if (!workbook.Sheets[sheetName]) {
            console.error(`Missing Sheet: ${sheetName}`);
            return;
        }

        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        console.log(`Processing ${data.length} rows (including header) from ${sheetName}...`);

        if (data.length < 2) return;

        const headers = data[0];
        const rows = data.slice(1);

        console.log('Headers found (first 20):', headers.slice(0, 20)); // DEBUG

        const dateCols = [];

        // Identify date columns by index
        headers.forEach((h, index) => {
            const dateVal = parseDateHeader(h);
            if (dateVal) {
                dateCols.push({ index: index, header: h, date: dateVal });
            }
        });

        console.log(`Identified ${dateCols.length} date columns.`);
        if (dateCols.length > 0) {
            console.log(`First date col: ${dateCols[0].header} (${dateCols[0].date})`);
            console.log(`Last date col: ${dateCols[dateCols.length - 1].header} (${dateCols[dateCols.length - 1].date})`);
        }

        let insertedCount = 0;

        console.log('Truncating programa_proyecto table to ensure clean state...');
        const { error: truncError } = await supabase.from('programa_proyecto').delete().neq('id', 0);
        if (truncError) console.error('Error truncating:', truncError);

        const recordsToInsert = [];

        // Map column names to indices for Project ID
        // We need to find "Numero" column index
        const numeroIndex = headers.findIndex(h => {
            if (typeof h !== 'string') return false;
            const low = h.trim().toLowerCase();
            return low === 'numero' || low === 'número' || low === 'n°' || low === 'n';
        });

        if (numeroIndex === -1) {
            console.error('Could not find "Numero" column');
            return;
        }
        console.log(`Numero column index: ${numeroIndex}`);

        for (const row of rows) {
            // Row is an array
            if (!row || row.length === 0) continue;

            const proyectoId = row[numeroIndex];
            if (!proyectoId) continue;

            // Unpivot
            for (const col of dateCols) {
                // Access by index
                let val = row[col.index];

                // Handle various number formats if needed, usually simple number
                if (typeof val === 'number' && val > 0) {
                    recordsToInsert.push({
                        proyecto_id: proyectoId,
                        fecha: col.date,
                        monto: val
                    });
                }
            }
        }

        console.log(`Found ${recordsToInsert.length} scheduling records to insert.`);

        // Batch Insert (Supabase limit is usually ~1000s, let's do batches of 1000)
        const BATCH_SIZE = 1000;
        for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
            const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from('programa_proyecto').insert(batch);
            if (error) {
                console.error(`Error inserting batch ${i}:`, error.message);
            } else {
                insertedCount += batch.length;
            }
            if (i % 5000 === 0) console.log(`  Inserted ${insertedCount} records...`);
        }

        console.log(`SUCCESS: Imported ${insertedCount} records into programa_proyecto.`);

    } catch (e) {
        console.error("Critical Error:", e);
    }
}

importProgramacion();
