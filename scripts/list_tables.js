
const { Client } = require('pg');

async function listTables() {
    const connectionString = 'postgres://postgres.zhtujzuuwecnqdecazam:pruebafondo@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
    const client = new Client({ connectionString });

    try {
        await client.connect();
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables in public schema:');
        res.rows.forEach(row => console.log(`- ${row.table_name}`));
    } catch (err) {
        console.error('Error listing tables:', err.message);
    } finally {
        await client.end();
    }
}

listTables();
