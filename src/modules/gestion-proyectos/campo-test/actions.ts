'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getPlanesSupervisionPendientes() {
  const supabase = await createClient();

  // 1. Traemos los planes pendientes
  const { data: planes, error } = await supabase
    .from('plan_supervision')
    .select('*')
    .eq('id_proyecto', 294) // Tu ID de prueba
    .eq('estado', 'pendiente');

  if (error || !planes || planes.length === 0) {
    console.error('No se encontró plan:', error);
    return [];
  }

  // 2. Obtenemos el proyecto manualmente con los nombres de campos CORRECTOS
  const planesConProyecto = await Promise.all(planes.map(async (plan) => {
    const { data: proyecto, error: proyError } = await supabase
      .from('proyectos')
      .select('id, nombre, monto_fondoempleo, beneficiarios') // ✅ monto_fondoempleo corregido
      .eq('id', plan.id_proyecto)
      .single();

    if (proyError) {
      console.error('Error al obtener proyecto:', proyError);
      return { ...plan, proyecto: null };
    }
    
    // Devolvemos el plan con el objeto proyecto dentro
    return { ...plan, proyecto };
  }));

  return planesConProyecto;
}

export async function guardarSupervision(payload: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { error } = await supabase
    .from('supervisiones_registro')
    .insert({
      id_plan: payload.id_plan,
      fecha_ejecucion: new Date().toISOString(),
      latitud: payload.latitud,
      longitud: payload.longitud,
      respuestas_json: payload.respuestas,
      fotos_urls: payload.fotos,
      firma_url: payload.firma,
    });

  if (error) throw new Error(error.message);

  await supabase
    .from('plan_supervision')
    .update({ estado: 'completado' })
    .eq('id', payload.id_plan);

  revalidatePath('/dashboard/campo');
  return { success: true };
}