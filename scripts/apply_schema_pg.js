const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL not found in .env');
    // Fallback: Construct it if we have credentials? 
    // Usually for Supabase: postgres://postgres:[YOUR-PASSWORD]@db.Ref.supabase.co:5432/postgres
}

const client = new Client({
    connectionString: connectionString,
});

async function run() {
    try {
        await client.connect();
        const sql = fs.readFileSync(path.resolve(__dirname, '../database_schema_v4.sql'), 'utf8');
        console.log('Running SQL...');
        await client.query(sql);
        console.log('Schema applied successfully.');
    } catch (e) {
        console.error('Error applying schema:', e);
    } finally {
        await client.end();
    }
}

run();
