'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getPlanesSupervisionPendientes(skipUserFilter = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // 1. Consultar el ID del monitor en la tabla 'monitores' usando el CORREO de Auth
  // Esto resuelve el conflicto de UUIDs diferentes entre Auth y la tabla monitores.
  const { data: monitorData } = await supabase
    .from('monitores')
    .select('id')
    .eq('correo', user.email)
    .single();

  let query = supabase
    .from('plan_supervision')
    .select('*')
    .eq('estado', 'pendiente');

  // Si se encuentra al monitor por correo, filtramos por su ID de supervisor
  if (monitorData && !skipUserFilter) {
    query = query.eq('id_supervisor', monitorData.id);
  } else if (!skipUserFilter) {
    // Si no se encuentra en la tabla monitores y no es modo auditoría,
    // es probable que sea un admin o un usuario sin planes.
    // Dejamos que la consulta continúe (si es admin verá todo por RLS o lógica previa)
  }

  const { data: planes, error } = await query;

  if (error || !planes || planes.length === 0) {
    console.error('No se encontraron planes pendientes:', error);
    return [];
  }

  // 2. Obtenemos el proyecto manualmente con los nombres de campos CORRECTOS
  const planesConProyecto = await Promise.all(planes.map(async (plan) => {
    const { data: proyecto, error: proyError } = await supabase
      .from('proyectos')
      .select('id, codigo_proyecto, nombre, monto_fondoempleo, beneficiarios, avance, institucion_ejecutora_id, region_id, etapa_id, contacto, sustento')
      .eq('id', plan.id_proyecto)
      .single();

    if (proyError) {
      console.error(`Error al obtener proyecto ${plan.id_proyecto}:`, proyError);
      return { ...plan, proyecto: null };
    }
    
    // Consulta independiente para la institución
    let nombre_institucion = null;
    if (proyecto.institucion_ejecutora_id) {
      const { data: inst, error: instErr } = await supabase
        .from('instituciones_ejecutoras')
        .select('nombre')
        .eq('id', proyecto.institucion_ejecutora_id)
        .single();
      
      if (instErr) console.error(`Error lookup institución (${proyecto.institucion_ejecutora_id}):`, instErr);
      if (inst?.nombre) nombre_institucion = inst.nombre;
    }

    // Consulta independiente para la Región
    let nombre_region = null;
    if (proyecto.region_id) {
      const { data: reg, error: regErr } = await supabase
        .from('regiones')
        .select('descripcion')
        .eq('id', proyecto.region_id)
        .single();
      
      if (regErr) console.error(`Error lookup región (${proyecto.region_id}):`, regErr);
      if (reg?.descripcion) nombre_region = reg.descripcion;
    }

    // Consulta independiente para la Etapa
    let nombre_etapa = null;
    if (proyecto.etapa_id) {
      const { data: etp, error: etpErr } = await supabase
        .from('etapas')
        .select('descripcion')
        .eq('id', proyecto.etapa_id)
        .single();
      
      if (etpErr) console.error(`Error lookup etapa (${proyecto.etapa_id}):`, etpErr);
      if (etp?.descripcion) nombre_etapa = etp.descripcion;
    }

    // Devolvemos el plan con el objeto proyecto enriquecido
    return { 
      ...plan, 
      proyecto: { 
        ...proyecto, 
        nombre_institucion,
        nombre_region,
        nombre_etapa
      } 
    };
  }));

  return planesConProyecto;
}

export async function getPlanById(planId: string) {
  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from('plan_supervision')
    .select('*')
    .eq('id', planId)
    .single();

  if (error || !plan) {
    console.error('No se encontró plan:', error);
    return null;
  }

  const { data: proyecto, error: proyError } = await supabase
    .from('proyectos')
    .select('id, codigo_proyecto, nombre, monto_fondoempleo, beneficiarios, avance, institucion_ejecutora_id, region_id, etapa_id, contacto, sustento')
    .eq('id', plan.id_proyecto)
    .single();

  if (proyError) return { ...plan, proyecto: null };

  // Enriquecer proyecto (mismo código que en getPlanesSupervisionPendientes)
  const { data: inst } = await supabase.from('instituciones_ejecutoras').select('nombre').eq('id', proyecto.institucion_ejecutora_id).single();
  const { data: reg } = await supabase.from('regiones').select('descripcion').eq('id', proyecto.region_id).single();
  const { data: etp } = await supabase.from('etapas').select('descripcion').eq('id', proyecto.etapa_id).single();

  return {
    ...plan,
    proyecto: {
      ...proyecto,
      nombre_institucion: inst?.nombre || null,
      nombre_region: reg?.descripcion || null,
      nombre_etapa: etp?.descripcion || null
    }
  };
}

export async function getSupervisionByPlanId(planId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('supervisiones_registro')
    .select('*')
    .eq('id_plan', planId)
    .single();
  
  if (error) return null;
  return data;
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