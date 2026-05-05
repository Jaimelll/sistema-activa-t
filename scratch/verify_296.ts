import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;

const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey);

async function verify() {
    console.log('--- DIAGNÓSTICO PROYECTO 296 ---');
    
    // 1. Buscar planes asociados al proyecto 296
    const { data: planes, error: planesError } = await supabaseAdmin
        .from('plan_supervision')
        .select('*')
        .eq('id_proyecto', 296);

    if (planesError) {
        console.error('Error buscando planes:', planesError);
        return;
    }

    console.log(`Se encontraron ${planes?.length || 0} planes para el proyecto 296:`);
    planes?.forEach(p => {
        console.log(`- Plan ID: ${p.id}, Estado: ${p.estado}, Monitor ID: ${p.id_supervisor}`);
    });

    if (planes && planes.length > 0) {
        const targetId = planes[0].id;
        console.log(`\nProbando actualización en Plan ID: ${targetId}...`);
        
        // 2. Intentar actualización de prueba
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('plan_supervision')
            .update({ 
                checklist_preguntas: planes[0].checklist_preguntas // Mantenemos lo mismo para no romper nada, pero forzamos el update
            })
            .eq('id', targetId)
            .select();

        if (updateError) {
            console.error('ERROR de actualización:', updateError);
        } else {
            console.log('ÉXITO de actualización. Filas afectadas:', updated?.length);
            console.log('Resultado:', updated[0].id, 'Estado:', updated[0].estado);
        }
    }
}

verify();
