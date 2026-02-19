const xlsx = require('xlsx');
const path = require('path');

const FILE_PATH = path.resolve(__dirname, '../Base7.xlsx');
console.log(`Reading ${FILE_PATH}`);

const workbook = xlsx.readFile(FILE_PATH);
const sheet = workbook.Sheets['proyecto_servicio'];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

const headers = rows[0];
console.log('Headers:', headers);

// Find Project 2
const idxNum = headers.findIndex(h => h && ['Numero', 'N°', 'N', 'No'].includes(h.trim()));
if (idxNum === -1) {
    console.error('Numero column not found');
    process.exit(1);
}

const p2 = rows.slice(1).find(r => r[idxNum] == 2);
console.log('Project 2 Row:', p2);

// Check Stage Columns for Project 2
const stageCols = ['Aprobación de bases', 'Bases', 'Lanzamiento', 'Actos Previos', 'Consejo', 'Convenio', 'Inicio obra', 'Ejecutado'];
console.log('\n--- Checking Stage Values for Project 2 ---');
stageCols.forEach(p => {
    const idx = headers.findIndex(h => h && h.trim() === p);
    if (idx !== -1) {
        console.log(`Col '${headers[idx]}':`, p2[idx]);
    } else {
        console.log(`Col '${p}': NOT FOUND`);
    }
});

// Check Date Columns > 2029
console.log('\n--- Checking Date Columns > 2029 ---');
headers.forEach((h, i) => {
    if (h && (h.includes('30') || h.includes('31') || h.includes('2030'))) {
        console.log(`Potential 2030+ Col [${i}] '${h}':`, p2 ? p2[i] : 'No Data');
    }
});
