const xlsx = require('xlsx');
const path = require('path');

const filePath = 'c:/trabajo/fondo/ACTIVA-T BD.xlsx';
const workbook = xlsx.readFile(filePath);

console.log('Sheets:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    if (data.length > 0) {
        console.log(`\nSheet: ${sheetName}`);
        console.log('Headers:', data[0]);
        console.log('First Row:', data[1]);
    }
});
