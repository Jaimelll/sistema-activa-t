const xlsx = require('xlsx');

const path = require('path');
const filePath = process.argv[2] || path.join(__dirname, '../..', 'Base.xlsx');
try {
    const workbook = xlsx.readFile(filePath);

    console.log("Sheets found:", workbook.SheetNames.join(", "));

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        // Get the range to ensure we read even if empty
        const range = xlsx.utils.decode_range(sheet['!ref'] || "A1");

        // Read headers (first row)
        const headers = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = { c: C, r: range.s.r };
            const cellRef = xlsx.utils.encode_cell(cellAddress);
            const cell = sheet[cellRef];
            if (cell && cell.v) headers.push(cell.v);
        }

        console.log(`\nSheet: ${sheetName}`);
        console.log(`Headers: ${JSON.stringify(headers)}`);

        // Peek at first row of data to infer types roughly
        const r1 = range.s.r + 1;
        const firstRowData = [];
        if (r1 <= range.e.r) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = xlsx.utils.encode_cell({ c: C, r: r1 });
                const cell = sheet[cellRef];
                firstRowData.push(cell ? cell.v : null);
            }
            console.log(`Example Data: ${JSON.stringify(firstRowData)}`);
        }
    });

} catch (e) {
    console.error("Error reading file:", e.message);
}
