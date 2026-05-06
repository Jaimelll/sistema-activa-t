'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export async function getPlanesSupervisionPendientes(skipUserFilter = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];
  
  console.log('--- VERIFICACIÓN DE CONEXIÓN LOCAL ---');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...');
  console.log('Usuario:', user.email);
  console.log('--------------------------------------');

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

  const GLOBAL_EMAILS = ['jduran@fondoempleo.com.pe', 'rcarbajal@fondoempleo.com.pe', 'erizabal@fondoempleo.com.pe'];
  const isGlobalUser = GLOBAL_EMAILS.includes(user.email?.toLowerCase() || '');

  // Si NO es usuario global y se encuentra al monitor por correo, filtramos por su ID de supervisor
  if (monitorData && !isGlobalUser && !skipUserFilter) {
    query = query.eq('id_supervisor', monitorData.id);
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

export async function getMisPlanesSupervision() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const GLOBAL_EMAILS = ['jduran@fondoempleo.com.pe', 'rcarbajal@fondoempleo.com.pe', 'erizabal@fondoempleo.com.pe'];
  const isGlobalUser = GLOBAL_EMAILS.includes(user.email?.toLowerCase() || '');

  let query = supabase
    .from('plan_supervision')
    .select('*')
    .order('fecha_programada', { ascending: false });

  // Si NO es un usuario global, filtramos por su monitor_id
  if (!isGlobalUser) {
    const { data: monitorData } = await supabase
      .from('monitores')
      .select('id')
      .eq('correo', user.email)
      .single();

    // Si no existe en la tabla monitores y no es admin, no tiene planes asignados
    if (!monitorData) return [];

    query = query.eq('id_supervisor', monitorData.id);
  }

  const { data: planes, error } = await query;

  if (error || !planes) return [];

  // Enriquecer con datos de proyecto
  const planesEnriquecidos = await Promise.all(planes.map(async (plan) => {
    const { data: proyecto } = await supabase
      .from('proyectos')
      .select('id, codigo_proyecto, nombre')
      .eq('id', plan.id_proyecto)
      .single();
    return { ...plan, proyecto };
  }));

  return planesEnriquecidos;
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
  console.log('--- LECTURA ADMINISTRATIVA DE REGISTRO ---');
  console.log('PlanId:', planId);

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from('supervisiones_registro')
    .select('*')
    .eq('id_plan', planId)
    .single();
  
  if (error) {
    console.warn('Registro no encontrado con id_plan:', planId, error.message);
    return null;
  }
  
  console.log('Registro recuperado con éxito mediante ADMIN.');
  return data;
}

export async function guardarSupervision(payload: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  // Usar cliente administrativo para saltar RLS en la inserción de evidencias
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
  );

  const { error } = await supabaseAdmin
    .from('supervisiones_registro')
    .insert({
      id_plan: payload.id_plan,
      fecha_ejecucion: new Date().toISOString(),
      latitud: payload.latitud,
      longitud: payload.longitud,
      coordenadas_gps: `${payload.latitud}, ${payload.longitud}`,
      respuestas_json: payload.respuestas,
      fotos_urls: payload.fotos,
      firma_url: payload.firma,
      // Opcional: podrías añadir user_id: user.id si la tabla lo requiere
    });

  if (error) {
    console.error('Error insertando en supervisiones_registro:', error);
    throw new Error(error.message);
  }

  console.log('Guardando supervisión para plan:', payload.id_plan);

  const { data: updatedData, error: updateError } = await supabaseAdmin
    .from('plan_supervision')
    .update({ 
      estado: 'ejecutado'
    })
    .eq('id', payload.id_plan)
    .select();

  if (updateError || !updatedData || updatedData.length === 0) {
    console.error('Error al actualizar estado del plan:', updateError?.message || '0 filas afectadas');
    throw new Error('No se pudo actualizar el estado del plan.');
  }

  revalidatePath('/dashboard/campo');
  return { success: true };
}

export async function finalizarPlanSupervision(payload: any) {
  const { id_plan: planId } = payload;
  console.log('--- INICIO FINALIZACIÓN INTEGRAL ---');
  console.log('ID del Plan:', planId);
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
  );

  // 1. Insertar el registro detallado en supervisiones_registro
  console.log('Insertando detalles en supervisiones_registro...');
  const { error: insertError } = await supabaseAdmin
    .from('supervisiones_registro')
    .upsert({
      id_plan: planId,
      fecha_ejecucion: new Date().toISOString(),
      latitud: payload.latitud,
      longitud: payload.longitud,
      coordenadas_gps: `${payload.latitud}, ${payload.longitud}`,
      respuestas_json: payload.respuestas,
      fotos_urls: payload.fotos,
      firma_url: payload.firma,
    }, { onConflict: 'id_plan' });

  if (insertError) {
    console.error('Error insertando detalles:', insertError);
    throw new Error(`Error al guardar detalles: ${insertError.message}`);
  }

  // 2. Actualizar el estado del plan_supervision
  console.log('Actualizando estado del plan...');
  const { data: updatedData, error: updateError } = await supabaseAdmin
    .from('plan_supervision')
    .update({ 
      estado: 'ejecutado'
    })
    .eq('id', planId)
    .select();

  if (updateError || !updatedData || updatedData.length === 0) {
    console.error('Error actualizando estado:', updateError?.message);
    throw new Error('No se pudo actualizar el estado del plan.');
  }

  console.log('Supervisión finalizada y guardada con éxito.');
  
  // Revalidación estándar de rutas
  revalidatePath('/dashboard/campo');
  revalidatePath('/dashboard/gestion-monitores');
  
  return { success: true };
}

export async function eliminarPlanSupervision(planId: string | number) {
    console.log('Eliminando plan desde módulo supervisión:', planId);
    
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autenticado' };

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
        );

        // 1. Obtener información de evidencias para limpiar el Storage
        const { data: registro } = await supabaseAdmin
            .from('supervisiones_registro')
            .select('fotos_urls, firma_url')
            .eq('id_plan', planId)
            .single();

        if (registro) {
            const filesToDelete: string[] = [];
            
            // Fotos
            if (registro.fotos_urls && Array.isArray(registro.fotos_urls)) {
                registro.fotos_urls.forEach((url: string) => {
                    const parts = url.split('/evidencias_supervision/');
                    if (parts.length > 1) filesToDelete.push(parts[1]);
                });
            }

            // Firma
            if (registro.firma_url) {
                const parts = registro.firma_url.split('/evidencias_supervision/');
                if (parts.length > 1) filesToDelete.push(parts[1]);
            }

            // Eliminar de Storage
            if (filesToDelete.length > 0) {
                console.log('Limpiando storage:', filesToDelete);
                await supabaseAdmin.storage.from('evidencias_supervision').remove(filesToDelete);
            }

            // 2. Borrar registro asociado
            await supabaseAdmin.from('supervisiones_registro').delete().eq('id_plan', planId);
        }

        // 3. Borrar el plan
        const { error } = await supabaseAdmin
            .from('plan_supervision')
            .delete()
            .eq('id', planId);

        if (error) throw error;

        revalidatePath('/dashboard/campo');
        revalidatePath('/dashboard/gestion-monitores');
        
        return { success: true };
    } catch (e: any) {
        console.error('Error eliminando plan:', e);
        return { success: false, error: e.message };
    }
}