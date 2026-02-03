
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zhtujzuuwecnqdecazam.supabase.co';
const supabaseKey = 'sb_secret_QVGaosj1XyHaNrPE1MEiKA_XFM7gExF'; // Service Role Key directly due to env issues in script execution context sometimes

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Checking Schema ---');
    const { data, error } = await supabase
        .from('proyectos_servicios')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No data found in table.');
        return;
    }

    const row = data[0];
    console.log('Keys found:', Object.keys(row));

    // Specific checks
    const checkCol = (name) => {
        if (row[name] !== undefined) {
            console.log(`Column '${name}': Value=${row[name]}, Type=${typeof row[name]}`);
        } else {
            console.log(`Column '${name}': NOT FOUND`);
        }
    }

    checkCol('eje');
    checkCol('eje_id');
    checkCol('linea');
    checkCol('línea');
    checkCol('linea_id');
    checkCol('año');
    checkCol('periodo');
}

check();
