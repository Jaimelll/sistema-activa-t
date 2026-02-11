const xlsx = require('xlsx');
const FILE_PATH = 'c:/trabajo/fondo/Base6.xlsx';

try {
    const workbook = xlsx.readFile(FILE_PATH);
    console.log('Sheets:', workbook.SheetNames);

    workbook.SheetNames.forEach(name => {
        const sheet = workbook.Sheets[name];
        const rows = xlsx.utils.sheet_to_json(sheet);
        console.log(`Sheet "${name}": ${rows.length} rows`);
        if (rows.length > 0) {
            console.log(`Headers "${name}":`, Object.keys(rows[0]));
            // Check first row for 'N°'
            console.log(`Row 1 sample:`, JSON.stringify(rows[0]));

            if (name === 'proyecto_servicio') {
                const ids = rows.map(r => r.numero || r.Numero || r.NUMERO);
                const uniqueIds = new Set(ids);
                console.log(`Total Rows: ${rows.length}, Unique IDs: ${uniqueIds.size}`);
                if (rows.length !== uniqueIds.size) {
                    console.log('Duplicate IDs found!');
                    // Find duplicates
                    const counts = {};
                    ids.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
                    const dups = Object.keys(counts).filter(k => counts[k] > 1);
                    console.log('Sample duplicates:', dups.slice(0, 10));
                }
            }
        }
    });

} catch (err) {
    console.error(err);
}
