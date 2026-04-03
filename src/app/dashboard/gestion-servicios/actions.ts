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
  const { data: avances, error: fetchError } = await supabase
    .from('avance_beca')
    .select('monto_avance')
    .eq('beca_id', becaId);

  if (fetchError) {
    console.error("Error fetching advances for recalculation:", fetchError);
    return;
  }

  const totalAvance = (avances || []).reduce((sum: number, av: any) => sum + Number(av.monto_avance || 0), 0);

  // Get the latest etapa_id from the latest avance (by date and id)
  const { data: latestAvance, error: latestError } = await supabase
    .from('avance_beca')
    .select('etapa_id')
    .eq('beca_id', becaId)
    .order('fecha', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .single();

  const updatePayload: any = {
    avance: totalAvance
  };

  if (latestAvance) {
    updatePayload.etapa_id = latestAvance.etapa_id;
  }

  const { error: updateError } = await supabase
    .from('becas_nueva')
    .update(updatePayload)
    .eq('id', becaId);

  if (updateError) {
    console.error("Error updating becas_nueva after recalculation:", updateError);
  }
}

export async function addAvanceServicio(becaId: any, avanceData: any) {
  const supabase = getSupabase();
  
  const { data, error: insertError } = await supabase
    .from('avance_beca')
    .insert([{ ...avanceData, beca_id: becaId }])
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
    .update(avanceData)
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
