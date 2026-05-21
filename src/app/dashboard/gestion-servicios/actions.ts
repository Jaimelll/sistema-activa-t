"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function getServiciosGestionData(filters?: { eje?: string; linea?: string; etapa?: string; modalidad?: string; condicion?: string; searchTerm?: string; institucion_id?: string; tipo_estudio_id?: string; grupo_id?: string; id_exacto?: string }) {
  const supabase = getSupabase();

  let query = supabase
    .from('becas_nueva')
    .select(`
      id, nombre, documento, eje_id, linea_id, etapa_id, modalidad_id, institucion_id, condicion_id, grupo_id, presupuesto, avance, beneficiarios,
      provincia_procedencia, distrito_procedencia, celular, correo_electronico, tipo_estudio_id, naturaleza_ie_id, especialidad, formato_id, fecha_nacimiento, sexo, empresa_id,
      eje:eje_id(descripcion),
      linea:linea_id(descripcion),
      etapa:etapa_id(descripcion),
      modalidad:modalidad_id(descripcion),
      institucion:institucion_id(descripcion),
      condicion:condicion_id(descripcion),
      grupo:grupo_id(descripcion),
      avances:avance_beca(id, fecha, etapa_id, sustento)
    `)
    .order('id', { ascending: true });

  if (filters?.searchTerm) {
    query = query.ilike('nombre', `%${filters.searchTerm}%`);
  }
  if (filters?.eje && filters.eje !== 'all') query = query.eq('eje_id', filters.eje);
  if (filters?.linea && filters.linea !== 'all') query = query.eq('linea_id', filters.linea);
  if (filters?.etapa && filters.etapa !== 'all') query = query.eq('etapa_id', filters.etapa);
  if (filters?.modalidad && filters.modalidad !== 'all') query = query.eq('modalidad_id', filters.modalidad);
  if (filters?.condicion && filters.condicion !== 'all') query = query.eq('condicion_id', filters.condicion);
  if (filters?.institucion_id && filters.institucion_id !== 'all') query = query.eq('institucion_id', filters.institucion_id);
  if (filters?.tipo_estudio_id && filters.tipo_estudio_id !== 'all') query = query.eq('tipo_estudio_id', filters.tipo_estudio_id);
  if (filters?.grupo_id && filters.grupo_id !== 'all') query = query.eq('grupo_id', filters.grupo_id);
  if (filters?.id_exacto) query = query.eq('id', filters.id_exacto);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching servicios gestion data:", error);
    return [];
  }

  return data || [];
}

function cleanBecaPayload(formData: any) {
  const allowedKeys = [
    'nombre',
    'documento',
    'periodo',
    'modalidad_id',
    'institucion_id',
    'eje_id',
    'linea_id',
    'etapa_id',
    'condicion_id',
    'grupo_id',
    'presupuesto',
    'avance',
    'beneficiarios',
    'provincia_procedencia',
    'distrito_procedencia',
    'celular',
    'correo_electronico',
    'tipo_estudio_id',
    'naturaleza_ie_id',
    'especialidad',
    'formato_id',
    'fecha_nacimiento',
    'sexo',
    'empresa_id'
  ];

  const cleaned: any = {};
  for (const key of allowedKeys) {
    if (key in formData) {
      const val = formData[key];
      cleaned[key] = (typeof val === 'string' && val.trim() === '') ? null : val;
    }
  }
  return cleaned;
}

export async function createServicio(formData: any) {
  try {
    const supabase = getSupabase();
    const payloadLimpio = cleanBecaPayload(formData);

    console.log("Payload limpio a enviar:", payloadLimpio);

    const { data, error } = await supabase
      .from('becas_nueva')
      .insert([payloadLimpio])
      .select();

    if (error) {
      console.error("Error creating servicio inside Supabase:", error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/gestion-servicios');
    return { success: true, data };
  } catch (err: any) {
    console.error("Uncaught error in createServicio:", err);
    return { success: false, error: err.message };
  }
}

export async function updateServicio(id: any, formData: any) {
  try {
    const supabase = getSupabase();
    const payloadLimpio = cleanBecaPayload(formData);

    console.log("Payload limpio a enviar:", payloadLimpio);

    const { data, error } = await supabase
      .from('becas_nueva')
      .update(payloadLimpio)
      .eq('id', id)
      .select();

    if (error) {
      console.error("Error updating servicio inside Supabase:", error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/gestion-servicios');
    return { success: true, data };
  } catch (err: any) {
    console.error("Uncaught error in updateServicio:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteServicio(id: any) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('becas_nueva')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting servicio:", error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/gestion-servicios');
  return { success: true };
}

async function recalculateBecaAvance(becaId: any, supabase: any) {
  // Safe date calculation for America/Lima (UTC-5)
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const peruTime = new Date(utc - (5 * 3600000));
  const today = peruTime.toISOString().split('T')[0];

  console.log(`[DEBUG] Recalculating stage for Beca ${becaId} as of ${today}`);

  // 1. Obtener TODO el historial de avances para este servicio
  const { data: allAvances, error: fetchError } = await supabase
    .from('avance_beca')
    .select('etapa_id, sustento, fecha')
    .eq('beca_id', becaId)
    .lte('fecha', today)                 // 2. Filtrar fecha <= hoy (ignora proyecciones)
    .order('fecha', { ascending: false }) // 3. Ordenar por fecha descendente
    .order('id', { ascending: false });

  if (fetchError) {
    console.error("[DEBUG] Error fetching history for sync:", fetchError);
    return;
  }

  if (allAvances && allAvances.length > 0) {
    // 4. El avance más reciente (índice 0) define la etapa actual
    const latestAvance = allAvances[0];
    const newEtapaId = latestAvance.etapa_id;

    // 5. Asigna como sustento el texto del avance más reciente. Si está vacío, busca hacia atrás.
    const sustentoFinal = allAvances.find((av: any) => av.sustento && av.sustento.trim() !== '')?.sustento || '';

    console.log(`[DEBUG] Updating Beca ${becaId} to Stage ${newEtapaId}`);
    
    await supabase
      .from('becas_nueva')
      .update({ 
        etapa_id: newEtapaId,
        sustento: sustentoFinal
      })
      .eq('id', becaId);
  } else {
    console.log(`[DEBUG] No valid advance found for Beca ${becaId}. Stage remains unchanged.`);
  }
}

export async function addAvanceServicio(becaId: any, avanceData: any) {
  const supabase = getSupabase();
  
  const { data, error: insertError } = await supabase
    .from('avance_beca')
    .insert([{ 
      beca_id: becaId,
      etapa_id: avanceData.etapa_id,
      fecha: avanceData.fecha,
      sustento: avanceData.sustento
    }])
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting avance:", insertError);
    throw new Error(insertError.message);
  }

  // Avance económico: Solo se debe actualizar el valor de avance en becas_nueva si el monto ingresado en el formulario es mayor a cero.
  if (Number(avanceData.monto) > 0) {
    const { data: beca } = await supabase
      .from('becas_nueva')
      .select('avance')
      .eq('id', becaId)
      .single();
    const currentAvance = Number(beca?.avance) || 0;
    const nuevoAvance = currentAvance + Number(avanceData.monto);
    await supabase
      .from('becas_nueva')
      .update({ avance: nuevoAvance })
      .eq('id', becaId);
  }

  await recalculateBecaAvance(becaId, supabase);

  revalidatePath('/dashboard/gestion-servicios');
  return data;
}

export async function updateAvanceServicio(id: any, avanceData: any) {
  const supabase = getSupabase();
  
  const { data, error: updateError } = await supabase
    .from('avance_beca')
    .update({
      etapa_id: avanceData.etapa_id,
      fecha: avanceData.fecha,
      sustento: avanceData.sustento
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating avance:", updateError);
    throw new Error(updateError.message);
  }

  if (data?.beca_id) {
    if (Number(avanceData.monto) > 0) {
      const { data: beca } = await supabase
        .from('becas_nueva')
        .select('avance')
        .eq('id', data.beca_id)
        .single();
      const currentAvance = Number(beca?.avance) || 0;
      const nuevoAvance = currentAvance + Number(avanceData.monto);
      await supabase
        .from('becas_nueva')
        .update({ avance: nuevoAvance })
        .eq('id', data.beca_id);
    }
    await recalculateBecaAvance(data.beca_id, supabase);
  }

  revalidatePath('/dashboard/gestion-servicios');
  return data;
}

export async function deleteAvanceServicio(id: any, becaId: any) {
  const supabase = getSupabase();
  
  const { error: deleteError } = await supabase
    .from('avance_beca')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error("Error deleting avance:", deleteError);
    throw new Error(deleteError.message);
  }

  await recalculateBecaAvance(becaId, supabase);

  revalidatePath('/dashboard/gestion-servicios');
  return { success: true };
}

export async function getCondiciones() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('condicion')
    .select('id, descripcion, becas_nueva!inner(id)')
    .order('id', { ascending: true });

  if (error) return [];
  // Use a Map to deduplicate if the join returns multiple rows per condition (though !inner with distinct usually works better)
  // Actually, Postgrest join with !inner will return the same condition multiple times if it has multiple becas unless we handle it.
  // A better way is to use the count filter or just deduplicate in JS if the list is small.
  const unique = Array.from(new Map(data.map((item: any) => [item.id, { value: item.id, label: item.descripcion }])).values());
  return unique;
}

export async function getInstitucionesBeca() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('institucion')
    .select('id, descripcion, becas_nueva!inner(id)')
    .order('descripcion', { ascending: true });

  if (error) return [];
  const unique = Array.from(new Map(data.map((item: any) => [item.id, { value: item.id, label: item.descripcion }])).values());
  return unique;
}

export async function getGrupos() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('grupo')
    .select('id, descripcion, orden, becas_nueva!inner(id)')
    .eq('tipo', 1)
    .order('orden', { ascending: true });

  if (error) {
    console.error("Error fetching grupos:", error);
    return [];
  }
  return data.map(item => ({ 
    value: item.id, 
    label: `${item.orden} - ${item.descripcion}` 
  }));
}

export async function getServicioCompletoById(id: number) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('becas_nueva')
    .select(`
      id, nombre, documento, eje_id, linea_id, etapa_id, modalidad_id, institucion_id, condicion_id, grupo_id, presupuesto, avance, beneficiarios,
      provincia_procedencia, distrito_procedencia, celular, correo_electronico, tipo_estudio_id, naturaleza_ie_id, especialidad, formato_id, fecha_nacimiento, sexo, empresa_id,
      eje:eje_id(descripcion),
      linea:linea_id(descripcion),
      etapa:etapa_id(descripcion),
      modalidad:modalidad_id(descripcion),
      institucion:institucion_id(descripcion),
      condicion:condicion_id(descripcion),
      grupo:grupo_id(descripcion),
      avances:avance_beca(id, fecha, etapa_id, sustento)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching servicio ${id}:`, error);
    return null;
  }

  return data;
}

export async function getTiposEstudio() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('tipo_estudio')
    .select('id, descripcion, becas_nueva!inner(id)')
    .order('id', { ascending: true });

  if (error) return [];
  const unique = Array.from(new Map(data.map((item: any) => [item.id, { value: item.id, label: item.descripcion }])).values());
  return unique;
}

export async function getNaturalezasIE() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('naturaleza_ie')
    .select('id, descripcion')
    .order('id', { ascending: true });

  if (error) return [];
  return data.map(item => ({ value: item.id, label: item.descripcion }));
}

export async function getFormatos() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('formato')
    .select('id, descripcion')
    .order('id', { ascending: true });

  if (error) return [];
  return data.map(item => ({ value: item.id, label: item.descripcion }));
}

export async function getEmpresas() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('empresas')
    .select('ruc, razon_social')
    .order('razon_social', { ascending: true });

  if (error) return [];
  return data.map(item => ({ value: item.ruc, label: `${item.ruc} - ${item.razon_social}` }));
}

