const xlsx = require('xlsx');

const filePath = 'c:/trabajo/fondo/ACTIVA-T BD.xlsx';
const workbook = xlsx.readFile(filePath);

const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const headers = xlsx.utils.sheet_to_json(sheet, { header: 1 })[0];

console.log('Detected Headers:');
console.log(JSON.stringify(headers));
