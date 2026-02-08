
const xlsx = require('xlsx');
const path = require('path');

const FILE_PATH = process.argv[2] || path.join(__dirname, '../Base4.xlsx');

try {
    const workbook = xlsx.readFile(FILE_PATH);

    // 1. Check Eje 5
    const ejeRows = xlsx.utils.sheet_to_json(workbook.Sheets['eje']);
    const eje5 = ejeRows.find(r => r.Numero == 5);
    console.log('--- Eje 5 Check ---');
    if (eje5) console.log('Found Eje 5:', JSON.stringify(eje5));
    else console.log('Eje 5 NOT FOUND in catalog!');

    // 2. Check Linea 8 (from debug output)
    const lineaRows = xlsx.utils.sheet_to_json(workbook.Sheets['linea']);
    const linea8 = lineaRows.find(r => r.Numero == 8);
    console.log('--- Linea 8 Check ---');
    if (linea8) console.log('Found Linea 8:', JSON.stringify(linea8));
    else console.log('Linea 8 NOT FOUND in catalog!');

    // 3. Duplicate Codes in Beca
    const becaRows = xlsx.utils.sheet_to_json(workbook.Sheets['beca']);
    console.log(`\n--- Duplicate Code Check (Total Rows: ${becaRows.length}) ---`);
    const codeCounts = {};
    let duplicates = 0;

    becaRows.forEach((r, i) => {
        const c = r['código del proyecto']; // clean this?
        if (c) {
            codeCounts[c] = (codeCounts[c] || 0) + 1;
        }
    });

    // Count duplicates
    Object.keys(codeCounts).forEach(k => {
        if (codeCounts[k] > 1) duplicates++;
    });

    console.log(`Unique Codes: ${Object.keys(codeCounts).length}`);
    console.log(`Codes appearing > 1 time: ${duplicates}`);

    // Sample duplicate
    const dupKey = Object.keys(codeCounts).find(k => codeCounts[k] > 1);
    if (dupKey) {
        console.log(`Sample Duplicate Code: ${dupKey} (Count: ${codeCounts[dupKey]})`);
        // Show rows
        const dupRows = becaRows.filter(r => r['código del proyecto'] == dupKey);
        console.log(JSON.stringify(dupRows.slice(0, 2), null, 2));
    }

} catch (e) {
    console.error(e);
}
