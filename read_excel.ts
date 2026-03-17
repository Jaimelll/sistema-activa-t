import * as xlsx from 'xlsx';

const workbook = xlsx.readFile('registros.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);

console.log('--- Data from Excel ---');
console.log(JSON.stringify(data, null, 2));
console.log('-----------------------');
