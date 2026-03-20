const XLSX = require('xlsx');
const path = require('path');

const excelPath = 'c:\\trabajo\\fondo\\avance_beca.xlsx';
console.log(`Leyendo archivo: ${excelPath}`);

try {
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`Sheet Name: ${sheetName}`);
    console.log(`Total filas en Excel: ${data.length}`);
    if (data.length > 0) {
        console.log('Columnas encontradas:', Object.keys(data[0]));
        console.log('Top 1 fila:', data[0]);
    }
} catch (error) {
    console.error('Error leyendo el Excel:', error.message);
}
