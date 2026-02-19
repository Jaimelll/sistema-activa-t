const xlsx = require('xlsx');
const path = require('path');

const FILE_PATH = path.resolve(__dirname, '../Base7.xlsx');
console.log(`Reading ${FILE_PATH}`);

const workbook = xlsx.readFile(FILE_PATH);
const sheet = workbook.Sheets['proyecto_servicio'];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

const headers = rows[0].map(h => h ? h.toString().trim() : '');
console.log('Headers (processed):', headers);

// Helper to find index case-insensitive
const findIdx = (patterns) => headers.findIndex(h => patterns.some(p => h.toLowerCase() === p.toLowerCase()));

const idxNum = findIdx(['Numero', 'N°', 'N', 'No']);
if (idxNum === -1) {
    console.error('Numero column not found');
    process.exit(1);
}

const p2 = rows.slice(1).find(r => r[idxNum] == 2);
console.log('Project 2 Row:', p2);

if (p2) {
    const idxEtapa = findIdx(['Etapa', 'Etapa_id']);
    console.log(`Etapa Column [${idxEtapa}]:`, p2[idxEtapa]);

    const stageCols = ['Aprobación de bases', 'Bases', 'Lanzamiento', 'Actos Previos', 'Consejo', 'Convenio', 'En ejecución', 'Inicio obra', 'Ejecutado'];
    console.log('\n--- Checking Stage Values for Project 2 ---');
    stageCols.forEach(p => {
        const idx = findIdx([p]);
        if (idx !== -1) {
            console.log(`Col '${headers[idx]}' [${idx}]:`, p2[idx]);
        }
    });
} else {
    console.log('Project 2 NOT FOUND');
}
