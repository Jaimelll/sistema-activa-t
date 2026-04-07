"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";


export async function getDashboardData(filters?: { periodo?: string; eje?: string; linea?: string; etapa?: string; modalidad?: string }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseServiceKey) {
    console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing");
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log("Env Check: URL=", supabaseUrl ? supabaseUrl.substring(0, 15) + "..." : "MISSING");

  let query = supabase
    .from('proyectos')
    .select(`
      *,
      lineas (descripcion),
      ejes (descripcion),
      regiones (descripcion),
      instituciones_ejecutoras (nombre),
      modalidades (descripcion),
      etapas (descripcion),
      especialista:especialistas(nombre),
      avance_tecnico,
      avance_proyecto (
        id,
        fecha,
        etapa_id,
        sustento
      )
    `);

  // --- 1. Filter by Year (Periodo) ---
  if (filters?.periodo && filters.periodo !== 'all' && filters.periodo !== 'undefined') {
    const yearVal = Number(filters.periodo);
    if (!isNaN(yearVal)) {
      // Assuming the DB column is 'año' based on existing code mapping
      query = query.eq('año', yearVal);
    }
  }

  // --- 2. Universal 'All' Logic for other filters ---
  const applyFilter = (column: string, value?: string) => {
    if (value && value !== 'all' && value !== 'todos') {
      // Schema check confirmed UUID strings for linea_id/eje_id. No numeric conversion needed.
      query = query.eq(column, value);
    }
  };

  applyFilter('eje_id', filters?.eje); // Correct column name from schema check: eje_id
  applyFilter('eje_id', filters?.eje); // Correct column name from schema check: eje_id
  applyFilter('linea_id', filters?.linea); // Correct column name from schema check: linea_id
  applyFilter('modalidad_id', filters?.modalidad);

  if (filters?.etapa && filters.etapa !== 'all' && filters.etapa !== 'todos') {
    query = query.eq('etapa_id', filters.etapa);
  }

  // --- 3. Status Exclusion (Always applied at end as requested) ---
  // "La exclusión de .not('etapas.descripcion', 'ilike', 'no habilitada') debe estar siempre presente al final"
  query = query.not('etapas.descripcion', 'ilike', 'no habilitada').order('id', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching dashboard data:", error);
    return [];
  }

  if (!data || data.length === 0) return [];

  const mappedData = data.map((p: any) => {
    // Helper to extract year
    let year = p.año ? String(p.año) : 'Unknown';
    if (year === 'Unknown' && p.fecha_inicio) {
      year = new Date(p.fecha_inicio).getFullYear().toString();
    } else if (year === 'Unknown' && p.created_at) {
      year = new Date(p.created_at).getFullYear().toString();
    }

    return {
      id: p.id,
      nombre: p.nombre || 'Sin Nombre',
      codigo: p.codigo_proyecto,
      region: p.regiones?.descripcion || p.region || 'Desconocido', // Fallback if still using text column? No, using FK join
      linea: p.lineas?.descripcion || 'Sin Linea',
      lineaId: p.linea_id, // Correct column: linea_id
      eje: p.ejes?.descripcion || 'Sin Eje',
      ejeId: p.eje_id, // Correct column: eje_id
      etapa: p.etapas?.descripcion || 'Sin Etapa', // Map descriptive stage
      etapaId: p.etapa_id, // Added: Mapped for execution filter
      institucion: p.instituciones_ejecutoras?.nombre || 'Sin Institucion',
      institucionId: p.institucion_ejecutora_id,
      gestora: p.gestora || '', // Added: New field
      regionId: p.region_id,
      modalidad: p.modalidades?.descripcion || 'Desconocido', // Added: Modality description

      modalidadId: p.modalidad_id, // Added: Modality ID for filtering
      estado: p.etapas?.descripcion || 'Activo',
      year: year,
      año: Number(p.año) || 0, // Added to satisfy frontend filter requirement
      monto_fondoempleo: Number(p.monto_fondoempleo) || 0,
      avance: Number(p.avance) || 0,
      contrapartida: Number(p.contrapartida) || 0,
      monto_total: Number(p.monto_total) || 0,
      beneficiarios: Number(p.beneficiarios) || 0,
      avance_tecnico: Number(p.avance_tecnico) || 0,
      fecha_inicio: p.avance_proyecto?.find((a: any) => a.etapa_id === 1)?.fecha || null,
      fecha_fin: p.avance_proyecto?.find((a: any) => a.etapa_id === 6)?.fecha || null,
      avances: p.avance_proyecto || [],
      grupo_id: p.grupo_id,
      provincia: p.provincia || '',
      especialista_id: p.especialista_id,
      especialista: p.especialista?.nombre || ''
    };
  });

  console.log("Debug Data Sample (Year):", mappedData[0]?.year, "Total Rows:", mappedData.length);
  return mappedData;
}

export async function getProyectoCompletoById(id: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: p, error } = await supabase
    .from('proyectos')
    .select(`
      *,
      lineas (descripcion),
      ejes (descripcion),
      regiones (descripcion),
      instituciones_ejecutoras (nombre),
      modalidades (descripcion),
      etapas (descripcion),
      especialista:especialistas(nombre),
      avance_proyecto (
        id,
        fecha,
        etapa_id,
        sustento,
        etapa:etapas(descripcion)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !p) {
    console.error("Error fetching project by id:", error);
    return null;
  }

  // Use the same robust mapping as getDashboardData to ensure compatibility with ProyectoModal
  const yearMatch = p.codigo?.match(/^(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : (Number(p.año) || new Date().getFullYear());

  return {
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    institucion: p.instituciones_ejecutoras?.nombre || 'Desconocido',
    institucionId: p.institucion_ejecutora_id,
    gestora: p.gestora,
    linea: p.lineas?.descripcion || 'Desconocido',
    lineaId: p.linea_id,
    eje: p.ejes?.descripcion || 'Desconocido',
    ejeId: p.eje_id,
    etapa: p.etapas?.descripcion || 'Desconocido',
    etapaId: p.etapa_id,
    region: p.regiones?.descripcion || 'Multirregional',
    regionId: p.region_id,
    modalidad: p.modalidades?.descripcion || 'Desconocido',
    modalidadId: p.modalidad_id,
    estado: p.etapas?.descripcion || 'Activo',
    year: year,
    año: Number(p.año) || 0,
    monto_fondoempleo: Number(p.monto_fondoempleo) || 0,
    avance: Number(p.avance) || 0,
    contrapartida: Number(p.contrapartida) || 0,
    monto_total: Number(p.monto_total) || 0,
    beneficiarios: Number(p.beneficiarios) || 0,
    avance_tecnico: Number(p.avance_tecnico) || 0,
    fecha_inicio: p.avance_proyecto?.find((a: any) => Number(a.etapa_id) === 1)?.fecha || null,
    fecha_fin: p.avance_proyecto?.find((a: any) => Number(a.etapa_id) === 6)?.fecha || null,
    avances: p.avance_proyecto?.map((av: any) => ({
      ...av,
      etapa_nombre: av.etapa?.descripcion || `Etapa ${av.etapa_id}`
    })) || [],
    grupo_id: p.grupo_id,
    provincia: p.provincia || '',
    especialista_id: p.especialista_id,
    especialista: p.especialista?.nombre || ''
  };
}

export async function getLineas() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('lineas')
    .select('id, descripcion')
    .order('id', { ascending: true }); // ID is the number now

  if (error) {
    console.error("Error fetching lines:", error);
    return [];
  }

  return data.map((item: any) => ({
    value: item.id,
    label: `L${item.id} - ${item.descripcion}` // Use ID as number
  }));
}

export async function getEjes() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('ejes')
    .select('id, descripcion')
    .order('id', { ascending: true }); // ID is the number now

  if (error) {
    console.error("Error fetching ejes:", error);
    return [];
  }

  return data.map((item: any) => ({
    value: item.id,
    label: `${item.id} - ${item.descripcion}` // Use ID as number
  }));
}

export async function getModalidades() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('modalidades')
    .select('id, descripcion')
    .order('id', { ascending: true });

  if (error) {
    console.error("Error fetching modalidades:", error);
    return [];
  }

  return data.map((item: any) => ({
    value: item.id,
    label: `${item.id} - ${item.descripcion}`
  }));
}

export async function getEspecialistas() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('especialistas')
    .select('id, nombre')
    .order('nombre', { ascending: true });

  if (error) {
    console.error("Error fetching especialistas:", error);
    return [];
  }

  return data.map((item: any) => ({
    value: item.id,
    label: item.nombre
  }));
}

export async function fetchDynamicYears() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('--- AUDIT START: fetchDynamicYears (No Cache) ---');

  // Optimize select to only fetch 'año'
  const { data, error } = await supabase
    .from('proyectos')
    .select('año'); // Optimized

  if (error) {
    console.error("Error fetching years:", error);
    return [];
  }

  // Extract unique years using Set, filter nulls and sort descending
  const uniqueYears = Array.from(new Set((data as any[]).map(d => Number(d.año))))
    .filter(y => !isNaN(y) && y > 0)
    .sort((a, b) => b - a);

  console.log("Unique Years Found:", uniqueYears);
  return uniqueYears;
}

export async function getEtapas() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('etapas')
    .select('descripcion')
    .not('descripcion', 'ilike', 'no habilitada');

  if (error) {
    console.error("Error fetching stages:", error);
    return [];
  }

  if (!data) return [];

  const uniqueStages = Array.from(new Set(data.map((d: any) => d.descripcion)))
    .filter(Boolean)
    .sort();

  return uniqueStages;
}

export async function getEtapasList() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('etapas')
    .select('id, descripcion')
    .order('id', { ascending: true });

  if (error) {
    console.error("Error fetching etapas list:", error);
    return [];
  }

  return data.map((item: any) => ({
    value: item.id,
    label: item.descripcion
  }));
}


// --- TIMELINE ACTIONS ---

export async function getTimelineData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('proyectos')
    .select(`
      id,
      nombre,
      etapa_id,
      eje_id,
      linea_id,
      region_id,
      codigo_proyecto,
      gestora,
      monto_fondoempleo,
      avance,
      ejes (descripcion),
      lineas (descripcion),
      instituciones_ejecutoras (nombre),
      regiones (descripcion),
      etapas (descripcion),
      grupo_id,
      grupo:grupo_id (descripcion, orden),
      avance_tecnico,
      provincia,
      especialista_id,
      especialista:especialistas(nombre),
      avance_proyecto (
        id,
        fecha,
        etapa_id,
        sustento
      )
    `)
    .not('etapas.descripcion', 'ilike', 'no habilitada');

  if (error) {
    console.error("Error fetching timeline data:", error);
    return [];
  }

  // Flatten and Format Data
  const mappedData = data.map((p: any) => ({
    id: p.id,
    nombre: p.nombre,
    estado: p.etapas?.descripcion || 'Activo',
    grupo_id: p.grupo_id,
    grupo_descripcion: p.grupo?.descripcion || 'Sin Grupo',
    grupo_orden: p.grupo?.orden || 999,
    eje_id: p.eje_id,
    linea_id: p.linea_id,
    eje: p.ejes?.descripcion || `Eje ${p.eje_id}`,
    linea: p.lineas?.descripcion || `Línea ${p.linea_id}`,
    codigo: p.codigo_proyecto || '-',
    gestora: p.gestora || '-',
    monto_fondoempleo: Number(p.monto_fondoempleo) || 0,
    avance: Number(p.avance) || 0,
    institucion: p.instituciones_ejecutoras?.nombre || '-',
    region: p.regiones?.descripcion || '-',
    etapa: p.etapas?.descripcion || 'Sin Etapa',
    avance_tecnico: Number(p.avance_tecnico) || 0,
    fecha_inicio: p.avance_proyecto.find((a: any) => a.etapa_id === 1)?.fecha || null,
    fecha_fin: p.avance_proyecto.find((a: any) => a.etapa_id === 6)?.fecha || null,
    avances: p.avance_proyecto.map((a: any) => ({
      id: a.id,
      fecha: a.fecha,
      etapa_id: a.etapa_id,
      sustento: a.sustento || ''
    })),
    provincia: p.provincia || '',
    especialista_id: p.especialista_id,
    especialista: p.especialista?.nombre || ''
  }));

  return mappedData;
}

// --- CORPORATIVO ACTIONS ---

export async function getFinanzasAnual() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('finanzas_anual')
    .select('*')
    .order('año', { ascending: true });

  if (error) {
    console.error("Error fetching finanzas anual:", error);
    return [];
  }

  return data;
}

export async function getAportantesAnual() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('aportantes_anual')
    .select('*')
    .order('año', { ascending: true })
    .order('monto', { ascending: false });

  if (error) {
    console.error("Error fetching aportantes anual:", error);
    return [];
  }

  return data;
}

// --- PROYECTOS CRUD ACTIONS ---

export async function createProyecto(formData: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('proyectos')
    .insert([formData])
    .select();

  if (error) {
    console.error("Error creating proyecto:", error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/gestion-proyectos');
  return data;
}

export async function updateProyecto(id: any, formData: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('proyectos')
    .update(formData)
    .eq('id', id)
    .select();

  if (error) {
    console.error("Error updating proyecto:", error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/gestion-proyectos');
  return data;
}

export async function deleteProyecto(id: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { error } = await supabase
    .from('proyectos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting proyecto:", error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/gestion-proyectos');
  return { success: true };
}

export async function getInstituciones() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('instituciones_ejecutoras')
    .select('id, nombre')
    .order('nombre', { ascending: true });

  if (error) {
    console.error("Error fetching instituciones:", error);
    return [];
  }

  return data.map((item: any) => ({
    value: item.id,
    label: item.nombre
  }));
}

export async function getRegiones() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('regiones')
    .select('id, descripcion')
    .order('descripcion', { ascending: true });

  if (error) {
    console.error("Error fetching regiones:", error);
    return [];
  }

  return data.map((item: any) => ({
    value: item.id,
    label: item.descripcion
  }));
}

// --- AVANCE PROYECTO ACTIONS ---

async function recalculateProyectoAvance(proyectoId: any, supabase: any) {
  // Get the latest etapa_id from the latest avance (by date and id)
  const { data: latestAvance, error: latestError } = await supabase
    .from('avance_proyecto')
    .select('etapa_id')
    .eq('proyecto_id', proyectoId)
    .order('fecha', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .single();

  if (latestAvance) {
    const { error: updateError } = await supabase
      .from('proyectos')
      .update({ etapa_id: latestAvance.etapa_id })
      .eq('id', proyectoId);

    if (updateError) {
      console.error("Error updating proyecto after recalculation:", updateError);
    }
  }
}

export async function addAvanceProyecto(proyectoId: any, avanceData: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error: insertError } = await supabase
    .from('avance_proyecto')
    .insert([{ ...avanceData, proyecto_id: proyectoId }])
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting avance:", insertError);
    throw new Error(insertError.message);
  }

  await recalculateProyectoAvance(proyectoId, supabase);

  revalidatePath('/dashboard/gestion-proyectos');
  return data;
}

export async function updateAvanceProyecto(id: any, avanceData: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error: updateError } = await supabase
    .from('avance_proyecto')
    .update(avanceData)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating avance — id recibido:", id, "— payload:", avanceData, "— error Supabase:", updateError);
    throw new Error(`[updateAvanceProyecto] ${updateError.message} (code: ${updateError.code})`);
  }

  if (data?.proyecto_id) {
    await recalculateProyectoAvance(data.proyecto_id, supabase);
  }

  revalidatePath('/dashboard/gestion-proyectos');
  return data;
}

export async function deleteAvanceProyecto(id: any, proyectoId: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { error: deleteError } = await supabase
    .from('avance_proyecto')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error("Error deleting avance:", deleteError);
    throw new Error(deleteError.message);
  }

  await recalculateProyectoAvance(proyectoId, supabase);

  revalidatePath('/dashboard/gestion-proyectos');
  return { success: true };
}

export async function getGruposProyectos() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('grupo')
    .select('id, descripcion, orden')
    .eq('tipo', 2)
    .order('orden', { ascending: true });

  if (error) {
    console.error("Error fetching grupos proyectos:", error);
    return [];
  }

  return data.map((item: any) => ({
    value: item.id,
    label: `${item.orden} - ${item.descripcion}`
  }));
}
