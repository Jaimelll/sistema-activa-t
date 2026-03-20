const XLSX = require('xlsx');
const path = require('path');

const excelPath = 'c:\\trabajo\\fondo\\beca_nuevas.xlsx';
console.log(`Leyendo archivo: ${excelPath}`);

try {
    const workbook = XLSX.readFile(excelPath);
    console.log('Hojas encontradas:', workbook.SheetNames);
    
    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        console.log(`--- Sheet: ${sheetName} ---`);
        console.log(`Total filas: ${data.length}`);
        if (data.length > 0) {
            console.log('Columnas:', Object.keys(data[0]));
            console.log('Ejemplo fila 1:', data[0]);
        }
    });
} catch (error) {
    console.error('Error leyendo el Excel:', error.message);
}
