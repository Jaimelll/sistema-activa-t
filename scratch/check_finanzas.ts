import { createClient } from '../src/utils/supabase/server';

async function testUpdate() {
    const supabase = await createClient();
    const rubro = 'Intereses';
    const nuevoMonto = 1234.56;

    console.log(`Intentando actualizar rubro: ${rubro} para 2026 Real a ${nuevoMonto}...`);

    const { data, error, count } = await supabase
        .from('finanzas_anual')
        .update({ monto: nuevoMonto })
        .eq('año', 2026)
        .eq('escenario', 'Real')
        .eq('rubro', rubro)
        .select();
    
    if (error) {
        console.error('Error de Supabase:', error);
        return;
    }

    console.log('Filas afectadas:', data?.length || 0);
    console.log('Data resultante:', JSON.stringify(data, null, 2));

    // Verificación final
    const { data: verify } = await supabase
        .from('finanzas_anual')
        .select('*')
        .eq('año', 2026)
        .eq('escenario', 'Real')
        .eq('rubro', rubro);
    
    console.log('Verificación inmediata:', JSON.stringify(verify, null, 2));
}

testUpdate();
