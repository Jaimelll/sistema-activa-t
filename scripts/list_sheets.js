
const xlsx = require('xlsx');
const workbook = xlsx.readFile('Base7.xlsx');
console.log('Sheet Names:', workbook.SheetNames);
