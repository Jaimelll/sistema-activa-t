"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function getServiciosGestionData(filters?: { eje?: string; linea?: string; etapa?: string; modalidad?: string; condicion?: string; searchTerm?: string }) {
  const supabase = getSupabase();

  let query = supabase
    .from('becas_nueva')
    .select(`
      *,
      eje:eje_id(descripcion),
      linea:linea_id(descripcion),
      etapa:etapa_id(descripcion),
      modalidad:modalidad_id(descripcion),
      institucion:institucion_id(descripcion),
      condicion:condicion_id(descripcion),
      grupo:grupo_id(descripcion),
      avances:avance_beca(*)
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

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching servicios gestion data:", error);
    return [];
  }

  return data || [];
}

export async function createServicio(formData: any) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('becas_nueva')
    .insert([formData])
    .select();

  if (error) {
    console.error("Error creating servicio:", error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/gestion-servicios');
  return data;
}

export async function updateServicio(id: any, formData: any) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('becas_nueva')
    .update(formData)
    .eq('id', id)
    .select();

  if (error) {
    console.error("Error updating servicio:", error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/gestion-servicios');
  return data;
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

  // Fetch only valid (past or current) advances
  const { data: latestValid, error } = await supabase
    .from('avance_beca')
    .select('etapa_id')
    .eq('beca_id', becaId)
    .lte('fecha', today)
    .order('fecha', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[DEBUG] Error fetching valid advances:", error);
    return;
  }

  if (latestValid) {
    console.log(`[DEBUG] Updating Beca ${becaId} to Stage ${latestValid.etapa_id}`);
    await supabase
      .from('becas_nueva')
      .update({ etapa_id: latestValid.etapa_id })
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
    .select('id, descripcion')
    .order('id', { ascending: true });

  if (error) return [];
  return data.map(item => ({ value: item.id, label: item.descripcion }));
}

export async function getInstitucionesBeca() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('institucion')
    .select('id, descripcion')
    .order('id', { ascending: true });

  if (error) return [];
  return data.map(item => ({ value: item.id, label: item.descripcion }));
}

export async function getGrupos() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('grupo')
    .select('id, descripcion, orden')
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
      *,
      eje:eje_id(descripcion),
      linea:linea_id(descripcion),
      etapa:etapa_id(descripcion),
      modalidad:modalidad_id(descripcion),
      institucion:institucion_id(descripcion),
      condicion:condicion_id(descripcion),
      grupo:grupo_id(descripcion),
      avances:avance_beca(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching servicio ${id}:`, error);
    return null;
  }

  return data;
}

