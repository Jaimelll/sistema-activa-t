'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
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
            proyecto:proyectos(id, codigo_proyecto, nombre, provincia, region_id, regiones(descripcion)),
            monitor:monitores(nombre)
        `)
        .order('fecha_programada', { ascending: false });
    
    if (error) {
        console.error('CRITICAL: Error fetching planes:', error);
        return [];
    }

    const statePriority: Record<string, number> = {
        'en proceso': 1,
        'pendiente': 2,
        'ejecutado': 3,
        'completado': 3
    };

    const sortedData = [...(data || [])].sort((a: any, b: any) => {
        const priorityA = statePriority[a.estado] || 99;
        const priorityB = statePriority[b.estado] || 99;
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        return new Date(b.fecha_programada).getTime() - new Date(a.fecha_programada).getTime();
    });

    return sortedData;
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

export async function eliminarPlanSupervision(planId: string | number) {
    console.log('Eliminando plan integral:', planId);

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Usuario no autenticado.' };
        }

        // Cliente administrativo para bypass RLS
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
        );

        // 1. Obtener información de evidencias para limpiar el Storage
        const { data: registros } = await supabaseAdmin
            .from('supervisiones_registro')
            .select('fotos_urls, firma_url')
            .eq('id_plan', planId);

        if (registros && registros.length > 0) {
            const filesToDelete: string[] = [];
            
            for (const registro of registros) {
                // Procesar fotos
                if (registro.fotos_urls && Array.isArray(registro.fotos_urls)) {
                    registro.fotos_urls.forEach((url: string) => {
                        const parts = url.split('/evidencias_supervision/');
                        if (parts.length > 1) filesToDelete.push(parts[1]);
                    });
                }

                // Procesar firma
                if (registro.firma_url) {
                    const parts = registro.firma_url.split('/evidencias_supervision/');
                    if (parts.length > 1) filesToDelete.push(parts[1]);
                }
            }

            // Eliminar archivos físicos
            if (filesToDelete.length > 0) {
                const uniqueFiles = [...new Set(filesToDelete)];
                console.log('Eliminando archivos físicos del Storage:', uniqueFiles);
                const { error: storageError } = await supabaseAdmin
                    .storage
                    .from('evidencias_supervision')
                    .remove(uniqueFiles);
                
                if (storageError) {
                    console.error('Error al eliminar archivos de Storage:', storageError);
                }
            }

            // 2. Eliminar el registro de supervisión
            await supabaseAdmin
                .from('supervisiones_registro')
                .delete()
                .eq('id_plan', planId);
        }

        // 3. Eliminar el plan principal
        const { data: deletedData, error: deleteError } = await supabaseAdmin
            .from('plan_supervision')
            .delete()
            .eq('id', planId)
            .select();

        if (deleteError) {
            throw deleteError;
        }

        if (!deletedData || deletedData.length === 0) {
            return { success: false, error: 'No se encontró el plan para eliminar o ya fue eliminado.' };
        }

        revalidatePath('/dashboard/gestion-monitores');
        revalidatePath('/dashboard/campo');
        
        return { success: true };
    } catch (e: any) {
        console.error('Excepción en eliminarPlanSupervision:', e);
        return { success: false, error: e.message || 'Error interno al eliminar el plan.' };
    }
}
