const { Client } = require('pg');

async function testConnection() {
    const connectionString = 'postgres://postgres.zhtujzuuwecnqdecazam:pruebafondo@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('Connection successful!');
        const res = await client.query('SELECT current_user;');
        console.log('User:', res.rows[0].current_user);
    } catch (err) {
        console.error('Connection failed:', err.message);
    } finally {
        await client.end();
    }
}

testConnection();
