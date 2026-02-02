
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runSchemaV2() {
    // Strategies to try
    const configs = [];

    // 1. Provided string with 'pruebafondo'
    if (process.env.DB_CREDENTIALS) {
        let cs = process.env.DB_CREDENTIALS.replace('[YOUR_PASSWORD]', 'pruebafondo');
        configs.push({ msg: 'Pooler + pruebafondo', cs });
    }

    // 2. Direct connection (Standard Supabase format)
    // postgres://postgres:[password]@db.[ref].supabase.co:5432/postgres
    const ref = 'zhtujzuuwecnqdecazam';
    const pass = 'pruebafondo';
    const directCS = `postgres://postgres:${pass}@db.${ref}.supabase.co:5432/postgres`;
    configs.push({ msg: 'Direct + pruebafondo', cs: directCS });

    for (const config of configs) {
        console.log(`Trying connection: ${config.msg}...`);
        const client = new Client({
            connectionString: config.cs,
            ssl: { rejectUnauthorized: false }
        });

        try {
            await client.connect();
            console.log('Connected!');
            const sqlPath = path.join(__dirname, '../database_schema_v2.sql');
            const sql = fs.readFileSync(sqlPath, 'utf8');
            await client.query(sql);
            console.log('Schema V2 applied successfully via ' + config.msg);
            await client.end();
            return; // Success
        } catch (e) {
            console.error(`Failed (${config.msg}):`, e.message);
            await client.end();
        }
    }

    console.error('All schema application attempts failed.');
    // We do NOT exit(1) here to allow import to try (though it will likely fail)
    // actually, if schema fails, import fails. But let's let it run to see logs.
    process.exit(1); // Added this line to ensure the process exits on failure, as per original logic.
}

runSchemaV2();
