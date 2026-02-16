
const xlsx = require('xlsx');
const workbook = xlsx.readFile('Base7.xlsx');
const sheet = workbook.Sheets['etapa'];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
console.log('Etapa Sheet Headers:', rows[0]);
