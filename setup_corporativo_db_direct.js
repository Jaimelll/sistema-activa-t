
const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function setupTables() {
    // Try direct connection instead of pooler
    const connectionString = 'postgres://postgres:pruebafondo@db.zhtujzuuwecnqdecazam.supabase.co:5432/postgres';
    const client = new Client({ connectionString });

    console.log('--- Creando tablas Corporativo (via direct pg) ---');

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
    DROP POLICY IF EXISTS "Enable all for service role" ON public.finanzas_anual;
    DROP POLICY IF EXISTS "Enable all for service role" ON public.aportantes_anual;

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
        process.exit(1);
    } finally {
        await client.end();
    }
}

setupTables();
