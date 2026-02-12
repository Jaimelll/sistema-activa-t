
const xlsx = require('xlsx');
const path = require('path');

const FILE_PATH = 'c:/trabajo/fondo/Base7.xlsx';

try {
    console.log('Reading:', FILE_PATH);
    const workbook = xlsx.readFile(FILE_PATH);
    console.log('Sheet Names:', workbook.SheetNames);


    const targetSheets = ['proyecto_servicio', 'beca'];
    targetSheets.forEach(name => {
        const sheet = workbook.Sheets[name];
        if (sheet) {
            const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
            if (json.length > 0) {
                console.log(`\n--- Sheet: ${name} ---`);
                console.log('Headers:', json[0]);
                console.log('Row 1:', json[1]);
                // Log a few more rows to see data types
                console.log('Row 2:', json[2]);
            }
        }
    });


} catch (err) {
    console.error(err);
}
