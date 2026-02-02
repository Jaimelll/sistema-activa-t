
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runSchemaV3() {
    // Strategies to try
    const configs = [];
    if (process.env.DB_CREDENTIALS) {
        let cs = process.env.DB_CREDENTIALS.replace('[YOUR_PASSWORD]', 'pruebafondo');
        configs.push({ msg: 'Pooler + pruebafondo', cs });
    }
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
            const sqlPath = path.join(__dirname, '../database_schema_v3.sql');
            const sql = fs.readFileSync(sqlPath, 'utf8');
            await client.query(sql);
            console.log('Schema V3 applied successfully via ' + config.msg);
            await client.end();
            return;
        } catch (e) {
            console.error(`Failed (${config.msg}):`, e.message);
            await client.end();
        }
    }
    process.exit(1);
}

runSchemaV3();
