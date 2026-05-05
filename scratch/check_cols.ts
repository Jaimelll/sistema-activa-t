import { createClient } from '@/utils/supabase/server';

async function test() {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.from('supervisiones_registro').select('*').limit(1);
        
        if (error) {
            console.error('Error de Supabase:', error);
            return;
        }

        if (data && data.length > 0) {
            console.log('Columnas de supervisiones_registro:', Object.keys(data[0]));
        } else {
            console.log('No se encontraron registros en supervisiones_registro.');
        }
    } catch (e) {
        console.error('Error de ejecución:', e);
    }
}

test();
