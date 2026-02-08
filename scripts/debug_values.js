
const xlsx = require('xlsx');
const path = require('path');

const FILE_PATH = process.argv[2] || path.join(__dirname, '../Base4.xlsx');

try {
    const workbook = xlsx.readFile(FILE_PATH);

    // Check Ejes Catalog
    const ejeRows = xlsx.utils.sheet_to_json(workbook.Sheets['eje']);
    console.log('--- Ejes Catalog (First 3) ---');
    console.log(JSON.stringify(ejeRows.slice(0, 3)));

    // Check Beca Data
    const becaRows = xlsx.utils.sheet_to_json(workbook.Sheets['beca']);
    console.log(`\n--- Beca Data (Total Rows: ${becaRows.length}) ---`);
    console.log('--- First 3 Becas ---');
    console.log(JSON.stringify(becaRows.slice(0, 3)));

    // Check Eje Value Types
    console.log('\n--- Eje Value Types in Beca ---');
    becaRows.slice(0, 5).forEach((r, i) => {
        console.log(`Row ${i} Eje: "${r['eje']}" (Type: ${typeof r['eje']})`);
    });

    // Check Code Column
    console.log('\n--- Code Column Check ---');
    becaRows.slice(0, 5).forEach((r, i) => {
        console.log(`Row ${i} Code (código del proyecto): "${r['código del proyecto']}"`);
    });

} catch (e) {
    console.error(e);
}
