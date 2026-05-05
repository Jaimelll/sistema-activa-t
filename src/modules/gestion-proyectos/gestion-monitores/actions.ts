'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getProyectosList() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('proyectos')
        .select('id, codigo_proyecto, nombre')
        .order('nombre', { ascending: true });
    
    if (error) {
        console.error('Error fetching proyectos:', error);
        return [];
    }
    return data;
}

export async function getMonitoresList() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('monitores')
        .select('id, nombre')
        .order('nombre', { ascending: true });
    
    if (error) {
        console.error('CRITICAL: Error fetching monitores:', error);
        return [];
    }
    return data || [];
}

export async function getPlanesSupervision() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('plan_supervision')
        .select(`
            *,
            proyecto:proyectos(id, codigo_proyecto, nombre),
            monitor:monitores(nombre)
        `)
        .order('fecha_programada', { ascending: false });
    
    if (error) {
        console.error('CRITICAL: Error fetching planes:', error);
        return [];
    }
    return data;
}

export async function crearPlanSupervision(payload: {
    id_proyecto: number;
    id_supervisor: string;
    fecha_programada: string;
    checklist_preguntas: any;
}) {
    const supabase = await createClient();
    
    // Log para depuración en el servidor
    console.log('Iniciando inserción de plan:', payload);

    const { data, error } = await supabase
        .from('plan_supervision')
        .insert({
            id_proyecto: payload.id_proyecto,
            id_supervisor: payload.id_supervisor,
            fecha_programada: payload.fecha_programada,
            checklist_preguntas: payload.checklist_preguntas,
            estado: 'pendiente'
        })
        .select();
    
    if (error) {
        console.error('ERROR Supabase (400?):', error);
        throw new Error(`Error de base de datos: ${error.message} (Código: ${error.code})`);
    }
    
    revalidatePath('/dashboard/gestion-monitores');
    return data;
}

export async function actualizarPlanSupervision(
    planId: string,
    payload: {
        id_proyecto: number;
        id_supervisor: string;
        fecha_programada: string;
        checklist_preguntas: any;
    }
) {
    const supabase = await createClient();

    console.log('Actualizando plan:', planId, payload);

    const { data, error } = await supabase
        .from('plan_supervision')
        .update({
            id_proyecto: payload.id_proyecto,
            id_supervisor: payload.id_supervisor,
            fecha_programada: payload.fecha_programada,
            checklist_preguntas: payload.checklist_preguntas,
        })
        .eq('id', planId)
        .eq('estado', 'pendiente')
        .select();

    if (error) {
        console.error('ERROR Supabase UPDATE:', error);
        throw new Error(`Error al actualizar: ${error.message} (Código: ${error.code})`);
    }

    if (!data || data.length === 0) {
        throw new Error('No se pudo actualizar. El plan no existe o ya no está en estado PENDIENTE.');
    }

    revalidatePath('/dashboard/gestion-monitores');
    return data;
}

export async function eliminarPlanSupervision(planId: string) {
    const supabase = await createClient();

    console.log('Eliminando plan:', planId);

    // Verificar que el plan esté en estado pendiente antes de eliminar
    const { data: plan, error: fetchError } = await supabase
        .from('plan_supervision')
        .select('id, estado')
        .eq('id', planId)
        .single();

    if (fetchError || !plan) {
        throw new Error('Plan no encontrado.');
    }

    if (plan.estado !== 'pendiente') {
        throw new Error('Solo se pueden eliminar planes en estado PENDIENTE.');
    }

    const { error } = await supabase
        .from('plan_supervision')
        .delete()
        .eq('id', planId);

    if (error) {
        console.error('ERROR Supabase DELETE:', error);
        throw new Error(`Error al eliminar: ${error.message} (Código: ${error.code})`);
    }

    revalidatePath('/dashboard/gestion-monitores');
    return { success: true };
}
