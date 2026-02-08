
const xlsx = require('xlsx');
const path = require('path');

const FILE_PATH = process.argv[2] || path.join(__dirname, '../Base4.xlsx');

try {
    const workbook = xlsx.readFile(FILE_PATH);
    console.log('Sheets:', workbook.SheetNames);

    ['proyecto_servicio', 'beca'].forEach(sheetName => {
        if (workbook.Sheets[sheetName]) {
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
            if (rows.length > 0) {
                console.log(`\n--- Headers for ${sheetName} ---`);
                console.log(JSON.stringify(rows[0]));
            }
        }
    });

} catch (e) {
    console.error(e);
}
