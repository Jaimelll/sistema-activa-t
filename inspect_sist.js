const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.resolve('sist.xlsx');
console.log(`Leyendo archivo: ${excelPath}`);
const workbook = XLSX.readFile(excelPath);

workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Hoja: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Header 1 to see all rows as arrays

    if (data.length > 0) {
        console.log('Primeras 5 filas:');
        data.slice(0, 5).forEach((row, i) => {
            console.log(`Fila ${i}:`, JSON.stringify(row));
        });
    } else {
        console.log('La hoja está vacía.');
    }
});
