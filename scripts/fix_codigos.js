
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const FILE_PATH = path.resolve(__dirname, '../Base7.xlsx');

async function fixCodigos() {
    console.log('--- FIX CODIGOS: Reading Excel ---');
    const workbook = xlsx.readFile(FILE_PATH);
    const sheet = workbook.Sheets['proyecto_servicio'];
    if (!sheet) throw new Error('Sheet proyecto_servicio not found');

    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    const headers = rawData[0];
    const dataRows = rawData.slice(1);

    // Find columns
    const getIdx = (patterns) => headers.findIndex(h => h && patterns.some(p => h.trim().toLowerCase() === p.toLowerCase()));
    const idxNum = getIdx(['Numero', 'N°', 'N', 'No']);
    const idxCod = getIdx(['código del proyecto', 'Código del proyecto', 'Codigo', 'Código']);

    console.log(`Numero col index: ${idxNum}, Código col index: ${idxCod}`);
    if (idxCod !== -1) console.log(`Header found: "${headers[idxCod]}"`);
    if (idxNum === -1) throw new Error('Numero column not found!');
    if (idxCod === -1) throw new Error('Código del proyecto column not found!');

    let updated = 0;
    let empty = 0;

    for (const row of dataRows) {
        const id = row[idxNum];
        if (!id) continue;

        let codigo = row[idxCod];
        if (!codigo || codigo.toString().trim() === '') {
            codigo = 'Sin código';
            empty++;
        } else {
            codigo = codigo.toString().trim();
        }

        const { error } = await supabase.from('proyectos_servicios')
            .update({ codigo_proyecto: codigo })
            .eq('id', id);

        if (error) {
            console.error(`Error updating ID ${id}:`, error.message);
        } else {
            updated++;
        }
    }

    console.log(`\nDone: ${updated} updated, ${empty} left as 'Sin código'`);
}

fixCodigos().catch(e => console.error(e));
