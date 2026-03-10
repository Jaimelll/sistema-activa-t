
const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function setupTables() {
    // Try pooler host but on port 5432
    const connectionString = 'postgres://postgres.zhtujzuuwecnqdecazam:pruebafondo@aws-0-us-east-1.pooler.supabase.com:5432/postgres';
    const client = new Client({ connectionString });

    console.log('--- Creando tablas Corporativo (via pooler port 5432) ---');

    const sql = `
    CREATE TABLE IF NOT EXISTS public.finanzas_anual (
        id SERIAL PRIMARY KEY,
        año INT NOT NULL,
        rubro TEXT NOT NULL,
        monto NUMERIC NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.aportantes_anual (
        id SERIAL PRIMARY KEY,
        año INT NOT NULL,
        empresa TEXT NOT NULL,
        monto NUMERIC NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- RLS
    ALTER TABLE public.finanzas_anual ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.aportantes_anual ENABLE ROW LEVEL SECURITY;

    -- Cleanup Policies
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.finanzas_anual;
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.aportantes_anual;

    -- Create Policies
    CREATE POLICY "Enable read access for all users" ON public.finanzas_anual FOR SELECT USING (true);
    CREATE POLICY "Enable read access for all users" ON public.aportantes_anual FOR SELECT USING (true);
    CREATE POLICY "Enable all for authenticated" ON public.finanzas_anual FOR ALL TO authenticated USING (true);
    CREATE POLICY "Enable all for authenticated" ON public.aportantes_anual FOR ALL TO authenticated USING (true);
    `;

    try {
        await client.connect();
        console.log('Conexión exitosa.');
        await client.query(sql);
        console.log('Tablas y políticas creadas exitosamente.');
    } catch (err) {
        console.error('Error al crear tablas:', err.message);
        // If this fails, we will try with specific options
        console.log('Retrying with options...');
        const client2 = new Client({
            connectionString: connectionString + '?options=project%3Dzhtujzuuwecnqdecazam'
        });
        try {
            await client2.connect();
            await client2.query(sql);
            console.log('Tablas creada con opciones.');
        } catch (err2) {
            console.error('Final Error:', err2.message);
        } finally {
            await client2.end();
        }
    } finally {
        await client.end();
    }
}

setupTables();
