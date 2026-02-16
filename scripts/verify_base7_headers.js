
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('--- Verifying Base7.xlsx ---');
    if (!fs.existsSync('Base7.xlsx')) {
        console.error('Error: Base7.xlsx not found!');
        return;
    }

    const workbook = xlsx.readFile('Base7.xlsx');
    const sheetName = 'proyecto_servicio';
    if (!workbook.Sheets[sheetName]) {
        console.error(`Error: Sheet '${sheetName}' not found!`);
        return;
    }

    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    const headers = data[0];
    console.log('Headers in proyecto_servicio:', JSON.stringify(headers));

    console.log('\n--- Verifying Database Schema ---');

    // Check 'etapas' table
    const { data: etapas, error: etapasError } = await supabase.from('etapas').select('*');
    if (etapasError) {
        console.error('Error fetching etapas:', etapasError);
    } else {
        console.log('Etapas found:', etapas.length);
        console.log('Etapas data:', JSON.stringify(etapas, null, 2));
    }

    // Check 'proyectos' table
    const { data: projects, error: projectsError } = await supabase.from('proyectos').select('*').limit(1);
    if (projectsError) {
        console.error('Error fetching projects:', projectsError);
    } else {
        if (projects.length > 0) {
            console.log('Sample project keys:', Object.keys(projects[0]));
            console.log('Sample project data:', JSON.stringify(projects[0], null, 2));
        } else {
            console.log('Projects table is empty.');
        }
    }
}

verify();
