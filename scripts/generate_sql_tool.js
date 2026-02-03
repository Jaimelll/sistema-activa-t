const xlsx = require('xlsx');
const path = require('path');

// Hardcoded path to the file as found in previous step
const FILE_PATH = String.raw`d:\data\LUCHO\docker\fondo\Base.xlsx`;

function generateSQL() {
    try {
        const workbook = xlsx.readFile(FILE_PATH);

        // Find sheet
        let sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('proyecto') || s.toLowerCase().includes('servicio'));
        if (!sheetName) sheetName = workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];
        // Read consistently as array of arrays
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null, blankrows: false });

        let sqlStatements = [];
        let count = 0;

        // Skip header (row 0)
        for (let i = 1; i < data.length; i++) {
            if (count >= 50) break;

            const row = data[i];
            if (!row || row.length === 0) continue;

            // Mapping (Base 0)
            // Index 1 (periodo) -> año
            // Index 4 (nombre...) -> nombre
            // Index 9 (cantidad de beneficiarios) -> beneficiarios
            // Index 10 (fondoempleo ) -> monto_fondoempleo
            // Index 11 (contrapartida ) -> monto_contrapartida

            const rawYear = row[1];
            const rawNombre = row[4];
            const rawBeneficiarios = row[9];
            const rawFondo = row[10];
            const rawContra = row[11];

            // Processing
            const ano = parseInt(rawYear);
            if (isNaN(ano)) continue; // Skip invalid rows

            const nombre = rawNombre ? String(rawNombre).replace(/'/g, "''") : '';
            const beneficiarios = parseInt(rawBeneficiarios) || 0;

            // Clean money: remove commas/symbols, keep decimals if any (though user said "numeros puros")
            // "numeros puros (ej. 1000000)" implies format but maybe value is float.
            // User said "números puros... sin comas". 
            // We'll parse float.

            const parseMoney = (val) => {
                if (!val) return 0;
                // Remove anything that is not digit, dot, or minus
                const cleaned = String(val).replace(/[^0-9.-]/g, '');
                return parseFloat(cleaned) || 0;
            };

            const monto_fondo = parseMoney(rawFondo);
            const monto_contra = parseMoney(rawContra);
            const monto_total = monto_fondo + monto_contra;

            // Create SQL
            // Table: public.proyectos_servicios
            // Columns: año, nombre, beneficiarios, monto_fondoempleo, monto_contrapartida, monto_total
            // Assuming we also need a 'codigo_proyecto' or 'id' for PK if not auto-generated? 
            // But user only asked for these fields. 
            // However, insert usually requires PK if not serial. 
            // Looking at previous import_v3.js, it generates 'codigo_proyecto'.
            // I will include codigo_proyecto to be safe, or just the requested columns if user insists.
            // User prompt: "Genera un bloque de sentencias SQL INSERT INTO public.proyectos_servicios para los registros ... Mapeo Exacto: ..."
            // I will add the mapped columns. If the DB fails due to missing PK, that's on the user, 
            // BUT to be helpful I will add codigo_proyecto as I saw in import_v3.js: `PROJ-USER-${i}-${v_año}`

            const codigo = `PROJ-SQL-${i}-${ano}`;

            const sql = `INSERT INTO public.proyectos_servicios (codigo_proyecto, "año", nombre, beneficiarios, monto_fondoempleo, monto_contrapartida, monto_total, estado) VALUES ('${codigo}', ${ano}, '${nombre}', ${beneficiarios}, ${monto_fondo}, ${monto_contra}, ${monto_total}, 'En Ejecución');`;

            sqlStatements.push(sql);
            count++;
        }

        console.log(sqlStatements.join('\n'));

    } catch (e) {
        console.error('Error generating SQL:', e);
    }
}

generateSQL();
