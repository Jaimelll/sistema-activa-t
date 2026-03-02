const xlsx = require('xlsx');

async function debugExcel() {
  try {
    const workbook = xlsx.readFile('c:/trabajo/fondo/Base7.xlsx');
    const sheetName = 'pago_gestora';
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      console.error(`Sheet ${sheetName} not found`);
      return;
    }
    const data = xlsx.utils.sheet_to_json(worksheet);
    console.log('Headers:', Object.keys(data[0] || {}));
    console.log('Sample Data (first 2 rows):', data.slice(0, 2));
  } catch (error) {
    console.error('Error reading Excel:', error);
  }
}

debugExcel();
