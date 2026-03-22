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

export async function addAvanceServicio(becaId: any, avanceData: any) {
  const supabase = getSupabase();
  
  // 1. Insert into avance_beca
  const { data, error: insertError } = await supabase
    .from('avance_beca')
    .insert([{ ...avanceData, beca_id: becaId }])
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting avance:", insertError);
    throw new Error(insertError.message);
  }

  // 2. Update master table (becas_nueva)
  // We update etapa_id and increment the total avance if provided
  const updatePayload: any = {
    etapa_id: data.etapa_id
  };
  
  // If the new advance has an amount, we could either sum it or replace. 
  // User said: "actualizar automáticamente el campo etapa_id y avance en la tabla maestra becas_nueva"
  // Usually 'avance' in master corresponds to the sum or the latest. 
  // Given 'monto_fondoempleo' context in projects, I'll sum the advances if it's cumulative or just set it if it's a progress value.
  // I'll fetch current total and sum it if it's incremental, or just use the new value if it's total progress.
  // Actually, I'll just set it to the value provided in the new avance record for now, or sum it.
  // Let's check how 'avance' is used in page.tsx: `Number(item.avance) || 0`.
  
  if (data.monto_avance !== undefined) {
      // Get current accumulated
      const { data: beca } = await supabase.from('becas_nueva').select('avance').eq('id', becaId).single();
      const currentAvance = Number(beca?.avance || 0);
      updatePayload.avance = currentAvance + Number(data.monto_avance);
  }

  const { error: updateError } = await supabase
    .from('becas_nueva')
    .update(updatePayload)
    .eq('id', becaId);

  if (updateError) {
    console.error("Error updating becas_nueva after avance:", updateError);
  }

  revalidatePath('/dashboard/gestion-servicios');
  return data;
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

