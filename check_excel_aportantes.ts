import * as xlsx from 'xlsx';
import * as fs from 'fs';

const workbook = xlsx.readFile('Aportantes.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

const output = {
  columns: data[0],
  firstRow: data[1],
  secondRow: data[2]
};

fs.writeFileSync('excel_output_aportantes.json', JSON.stringify(output, null, 2));
console.log('Done');
