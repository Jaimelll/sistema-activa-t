const xlsx = require('xlsx');
const FILE_PATH = '/app/Base7.xlsx';

try {
    const workbook = xlsx.readFile(FILE_PATH);
    const sheetName = 'proyecto_servicio';
    const worksheet = workbook.Sheets[sheetName];

    // Get headers using sheet_to_json with header: 1 to get array of arrays
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    if (jsonData.length > 0) {
        console.log('Row 0 (Headers):', jsonData[0]);
        console.log('Row 1 (First Data):', jsonData[1]);
    } else {
        console.log('Sheet is empty');
    }
} catch (e) {
    console.error(e);
}
