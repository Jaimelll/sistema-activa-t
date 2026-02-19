
const xlsx = require('xlsx');
const path = require('path');
const FILE_PATH = path.resolve(__dirname, '../Base7.xlsx');
const workbook = xlsx.readFile(FILE_PATH);
const sheet = workbook.Sheets['beca'];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // Array of arrays
console.log('Beca Headers:', rows[0]);
