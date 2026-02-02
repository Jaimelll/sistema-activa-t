
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runSchema() {
    let connectionString = process.env.DB_CREDENTIALS;
    if (connectionString && connectionString.includes('[YOUR_PASSWORD]')) {
        connectionString = connectionString.replace('[YOUR_PASSWORD]', 'pruebafondo');
    }

    if (!connectionString) {
        // Fallback or error
        console.error('No DB_CREDENTIALS found.');
        process.exit(1);
    }

    console.log('Connecting to DB...');
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Supabase usually requires SSL
    });

    try {
        await client.connect();
        console.log('Connected.');

        const sqlPath = path.join(__dirname, '../database_schema_new.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing SQL...');
        await client.query(sql);
        console.log('Schema applied successfully.');

    } catch (e) {
        console.error('Schema Error:', e);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runSchema();
