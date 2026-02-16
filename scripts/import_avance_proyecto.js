
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or Service Key is missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importAvance() {
    console.log('--- Importing Avance Proyecto from Base7.xlsx ---');

    if (!fs.existsSync('Base7.xlsx')) {
        console.error('Error: Base7.xlsx not found!');
        return;
    }

    const workbook = xlsx.readFile('Base7.xlsx');
    const sheetName = 'proyecto_servicio';
    if (!workbook.Sheets[sheetName]) {
        console.error(`Error: Sheet '${sheetName}' not found!`);
        return;
    }

    const sheet = workbook.Sheets[sheetName];
    // Convert to array of arrays to find header row securely
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`Total raw rows in Excel: ${rows.length}`);

    // Fetch projects from proyectos_servicios to validate IDs
    const { data: projects, error: projectsError } = await supabase
        .from('proyectos_servicios')
        .select('id');

    if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        return;
    }

    const validIds = new Set();
    projects.forEach(p => {
        if (p.id) validIds.add(p.id);
    });

    // Find header row 
    let headerRowIndex = -1;
    const targetHeader = 'Aprobación de bases';

    for (let i = 0; i < Math.min(rows.length, 20); i++) {
        if (rows[i].includes(targetHeader)) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.error(`CRITICAL: Header '${targetHeader}' not found in first 20 rows.`);
        // Dump first 3 rows to see what IS there
        console.log('Row 0:', rows[0]);
        console.log('Row 1:', rows[1]);
        return;
    }

    console.log(`Found header '${targetHeader}' at row index ${headerRowIndex}.`);
    const headers = rows[headerRowIndex];

    // Map header names to indices
    const colMap = {};
    headers.forEach((h, idx) => {
        if (h) colMap[h.trim()] = idx;
    });

    // Verify main columns exist
    const mappings = [
        { name: 'Aprobación de bases', id: 1 },
        { name: 'Actos Previos', id: 2 },
        { name: 'Aprobación de consejo', id: 3 },
        { name: 'Firma convenio', id: 4 }
    ];

    if (!colMap['numero']) {
        console.warn("Warning: 'numero' column not found in headers! Keys found: " + Object.keys(colMap).join(', '));
        // Fallback: Check if there's 'item' or similar? Or check 'numero' case insensitive?
        const numeroC = headers.find(h => h && h.toLowerCase().trim() === 'numero');
        if (numeroC) colMap['numero'] = colMap[numeroC.trim()];
    }

    if (colMap['numero'] === undefined) {
        console.error("Error: Cannot proceed without 'numero' column.");
        return;
    }

    let insertedCount = 0;
    let errorCount = 0;

    // Process data rows (start after header)
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        const numero = row[colMap['numero']];

        if (!numero) continue;

        const proyectoId = parseInt(numero, 10);
        if (isNaN(proyectoId)) continue;

        if (!validIds.has(proyectoId)) {
            continue;
        }

        for (const mapping of mappings) {
            const colIdx = colMap[mapping.name];
            if (colIdx === undefined) {
                // console.warn(`Column '${mapping.name}' not found.`);
                continue;
            }

            const rawDate = row[colIdx];

            if (rawDate) {
                let dateValue = null;

                // Handle Excel serial date or string date
                if (typeof rawDate === 'number') {
                    const dateObj = xlsx.SSF.parse_date_code(rawDate);
                    // Format YYYY-MM-DD
                    dateValue = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
                } else if (typeof rawDate === 'string') {
                    // Trim and check
                    const trimDate = rawDate.trim();
                    if (trimDate) dateValue = trimDate;
                }

                if (dateValue) {
                    const { error } = await supabase.from('avance_proyecto').insert({
                        proyecto_id: proyectoId,
                        etapa_id: mapping.id,
                        fecha: dateValue,
                        sustento: 'Cargado desde Base7'
                    });

                    if (error) {
                        console.error(`Error inserting proyecto ${proyectoId} etapa ${mapping.id}:`, error.message);
                        errorCount++;
                    } else {
                        insertedCount++;
                    }
                }
            }
        }
    }

    console.log(`\nImport completed.`);
    console.log(`Inserted: ${insertedCount}`);
    console.log(`Errors: ${errorCount}`);
}

importAvance();
