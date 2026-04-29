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
        .select('*')
        .order('nombre', { ascending: true });
    
    if (error) {
        console.error('CRITICAL: Error fetching monitores:', error);
        return [];
    }
    return data;
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
    
    const { data, error } = await supabase
        .from('plan_supervision')
        .insert([{
            id_proyecto: payload.id_proyecto,
            id_supervisor: payload.id_supervisor,
            fecha_programada: payload.fecha_programada,
            checklist_preguntas: payload.checklist_preguntas,
            estado: 'pendiente'
        }])
        .select();
    
    if (error) {
        console.error('Error creating plan:', error);
        throw new Error(error.message);
    }
    
    revalidatePath('/dashboard/gestion-monitores');
    return data;
}
