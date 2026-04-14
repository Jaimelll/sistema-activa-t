"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";


export async function getDashboardData(filters?: { periodo?: string; eje?: string; linea?: string; etapa?: string; modalidad?: string; especialistaId?: string }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing");
      return [];
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let query = supabase
      .from('proyectos')
      .select(`
        *,
        lineas (descripcion),
        ejes (descripcion),
        regiones (descripcion),
        instituciones_ejecutoras (nombre),
        modalidades (descripcion),
        etapas (descripcion, fase),
        especialista:especialistas(nombre),
        avance_tecnico,
        check_inicio:avance_proyecto!inner(etapa_id),
        avance_proyecto (
          id,
          fecha,
          etapa_id,
          sustento,
          monto
        )
      `)
      .eq('check_inicio.etapa_id', 1);

    if (filters?.periodo && filters.periodo !== 'all' && filters.periodo !== 'undefined') {
      const yearVal = Number(filters.periodo);
      if (!isNaN(yearVal)) query = query.eq('año', yearVal);
    }

    const applyFilter = (column: string, value?: string) => {
      if (value && value !== 'all' && value !== 'todos') {
        query = query.eq(column, value);
      }
    };

    applyFilter('eje_id', filters?.eje);
    applyFilter('linea_id', filters?.linea);
    applyFilter('modalidad_id', filters?.modalidad);
    applyFilter('especialista_id', filters?.especialistaId);

    if (filters?.etapa && filters.etapa !== 'all' && filters.etapa !== 'todos') {
      query = query.eq('etapa_id', filters.etapa);
    }

    if (filters?.especialistaId && Number(filters.especialistaId) !== 0) {
      query = query.eq('especialista_id', filters.especialistaId);
    }

    query = query.not('etapas.descripcion', 'ilike', 'no habilitada').order('id', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching dashboard data:", error);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((p: any) => {
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
        codigo_proyecto: p.codigo_proyecto,
        region: p.regiones?.descripcion || p.region || 'Desconocido',
        linea: p.lineas?.descripcion || 'Sin Linea',
        lineaId: p.linea_id,
        eje: p.ejes?.descripcion || 'Sin Eje',
        ejeId: p.eje_id,
        etapa: p.etapas?.descripcion || 'Sin Etapa',
        etapaId: p.etapa_id,
        institucion: p.instituciones_ejecutoras?.nombre || 'Sin Institucion',
        institucionId: p.institucion_ejecutora_id,
        gestora: p.gestora || '',
        regionId: p.region_id,
        modalidad: p.modalidades?.descripcion || 'Desconocido',
        modalidadId: p.modalidad_id,
        estado: p.etapas?.descripcion || 'Activo',
        sustento: p.sustento || '',
        year: year,
        año: Number(p.año) || 0,
        fase: p.etapas?.fase || '',
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
  } catch (err) {
    console.error("FATAL ERROR getDashboardData:", err);
    return [];
  }
}

// --- GLOBAL DASHBOARD FILTERS (REACTIVE) ---

export async function getDashboardStats(especialistaId?: number) {
    return await getDashboardData({ especialistaId: especialistaId?.toString() });
}

export async function getRegionData(especialistaId?: number) {
    // Current implementation uses getDashboardData and aggregates client-side, 
    // but we satisfy the named function requirement.
    return await getDashboardData({ especialistaId: especialistaId?.toString() });
}

export async function getInstitucionData(especialistaId?: number) {
    // Current implementation uses getDashboardData and aggregates client-side
    return await getDashboardData({ especialistaId: especialistaId?.toString() });
}

export async function getProyectoCompletoById(id: string) {
  try {
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
        etapas (descripcion, fase),
        especialista:especialistas(nombre),
        avance_proyecto (
          id,
          fecha,
          etapa_id,
          sustento,
          monto,
          etapa:etapas(descripcion)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !p) {
      console.error("Error fetching project by id:", error);
      return null;
    }

    const yearMatch = p.codigo_proyecto?.match(/^(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : (Number(p.año) || new Date().getFullYear());

    return {
      id: p.id,
      codigo: p.codigo_proyecto,
      codigo_proyecto: p.codigo_proyecto,
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
      sustento: p.sustento || '',
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
  } catch (err) {
    console.error("FATAL ERROR getProyectoCompletoById:", err);
    return null;
  }
}

export async function getLineas() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('lineas')
      .select('id, descripcion')
      .order('id', { ascending: true });

    if (error) {
      console.error("Error fetching lines:", error);
      return [];
    }

    return data.map((item: any) => ({
      value: item.id,
      label: `L${item.id} - ${item.descripcion}`
    }));
  } catch (err) {
    console.error("FATAL ERROR getLineas:", err);
    return [];
  }
}

export async function getEjes() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('ejes')
      .select('id, descripcion')
      .order('id', { ascending: true });

    if (error) {
      console.error("Error fetching ejes:", error);
      return [];
    }

    return data.map((item: any) => ({
      value: item.id,
      label: `${item.id} - ${item.descripcion}`
    }));
  } catch (err) {
    console.error("FATAL ERROR getEjes:", err);
    return [];
  }
}

export async function getModalidades() {
  try {
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
  } catch (err) {
    console.error("FATAL ERROR getModalidades:", err);
    return [];
  }
}

export async function getEspecialistas() {
  try {
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
  } catch (err) {
    console.error("FATAL ERROR getEspecialistas:", err);
    return [];
  }
}

export async function fetchDynamicYears() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('proyectos')
      .select('año');

    if (error) {
      console.error("Error fetching years:", error);
      return [];
    }

    const uniqueYears = Array.from(new Set((data as any[]).map(d => Number(d.año))))
      .filter(y => !isNaN(y) && y > 0)
      .sort((a, b) => b - a);

    return uniqueYears;
  } catch (err) {
    console.error("FATAL ERROR fetchDynamicYears:", err);
    return [];
  }
}

export async function getEtapas() {
  try {
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
    return Array.from(new Set(data.map((d: any) => d.descripcion))).filter(Boolean).sort();
  } catch (err) {
    console.error("FATAL ERROR getEtapas:", err);
    return [];
  }
}

export async function getEtapasList() {
  try {
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
  } catch (err) {
    console.error("FATAL ERROR getEtapasList:", err);
    return [];
  }
}

export async function getFasesOptions() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('etapas')
      .select('id, fase')
      .order('id', { ascending: true });

    if (error) {
      console.error("Error fetching fases list unique:", error);
      return [];
    }

    return [...new Set(data.map((item: any) => item.fase))].filter(Boolean) as string[];
  } catch (err) {
    console.error("FATAL ERROR getFasesOptions:", err);
    return [];
  }
}


// --- TIMELINE ACTIONS ---

export async function getTimelineData(especialistaId?: number) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase
      .from('proyectos')
      .select(`
        id, nombre, etapa_id, eje_id, linea_id, region_id, codigo_proyecto, gestora, monto_fondoempleo, avance,
        ejes (descripcion),
        lineas (descripcion),
        instituciones_ejecutoras (nombre),
        regiones (descripcion),
        etapas (descripcion, fase),
        grupo_id,
        grupo (id, descripcion, orden),
        avance_tecnico, provincia, especialista_id,
        especialista:especialistas(nombre),
        check_inicio:avance_proyecto!inner(etapa_id),
        avance_proyecto (id, fecha, etapa_id, sustento)
      `)
      .eq('check_inicio.etapa_id', 1);

    if (especialistaId && especialistaId !== 0) {
      query = query.eq('especialista_id', especialistaId);
    }

    const { data, error } = await query
      .not('etapas.descripcion', 'ilike', 'no habilitada')
      .order('id', { ascending: true });

    if (error) {
      console.error("Error Timeline:", error);
      return [];
    }

    return data.map((p: any) => ({
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
      codigo_proyecto: p.codigo_proyecto || '-',
      gestora: p.gestora || '-',
      monto_fondoempleo: Number(p.monto_fondoempleo) || 0,
      avance: Number(p.avance) || 0,
      institucion: p.instituciones_ejecutoras?.nombre || '-',
      region: p.regiones?.descripcion || '-',
      etapa: p.etapas?.descripcion || 'Sin Etapa',
      fase: p.etapas?.fase || '',
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
  } catch (err) {
    console.error("FATAL ERROR getTimelineData:", err);
    return [];
  }
}

// --- CORPORATIVO ACTIONS ---

export async function getFinanzasAnual() {
  try {
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
  } catch (err) {
    console.error("FATAL ERROR getFinanzasAnual:", err);
    return [];
  }
}

export async function getAportantesAnual() {
  try {
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
  } catch (err) {
    console.error("FATAL ERROR getAportantesAnual:", err);
    return [];
  }
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
  try {
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
  } catch (err) {
    console.error("FATAL ERROR getInstituciones:", err);
    return [];
  }
}

export async function getRegiones() {
  try {
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
  } catch (err) {
    console.error("FATAL ERROR getRegiones:", err);
    return [];
  }
}

// --- AVANCE PROYECTO ACTIONS ---

async function recalculateProyectoAvance(proyectoId: any, supabase: any, currentMonto?: number) {
  const today = new Date().toISOString().split('T')[0];
  // Get the latest etapa_id and sustento from the latest avance (fecha <= today)
  const { data: latestAvance, error: latestError } = await supabase
    .from('avance_proyecto')
    .select('etapa_id, sustento')
    .eq('proyecto_id', proyectoId)
    .lte('fecha', today)
    .order('fecha', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .single();

  if (latestAvance) {
    // Regla de negocio: solo actualizar el avance financiero en 'proyectos'
    // si el monto del avance procesado es mayor a cero.
    // Los avances con monto === 0 se guardan como historial cualitativo
    // pero NO alteran el avance financiero del proyecto principal.
    if (currentMonto !== undefined && currentMonto > 0) {
      // Calculate the SUM of all montos for this project
      const { data: totalMonto, error: sumError } = await supabase
        .from('avance_proyecto')
        .select('monto')
        .eq('proyecto_id', proyectoId);

      const totalAvance = totalMonto?.reduce((sum: number, item: any) => sum + (Number(item.monto) || 0), 0) || 0;

      const { error: updateError } = await supabase
        .from('proyectos')
        .update({ 
          etapa_id: latestAvance.etapa_id,
          sustento: latestAvance.sustento,
          avance: totalAvance
        })
        .eq('id', proyectoId);

      if (updateError) {
        console.error("Error updating proyecto avance financiero after recalculation:", updateError);
      }
    } else {
      // Monto === 0: solo actualizar etapa y sustento, sin tocar el avance financiero
      const { error: updateError } = await supabase
        .from('proyectos')
        .update({ 
          etapa_id: latestAvance.etapa_id,
          sustento: latestAvance.sustento
        })
        .eq('id', proyectoId);

      if (updateError) {
        console.error("Error updating proyecto etapa/sustento (monto=0):", updateError);
      }
    }
  }
}

export async function addAvanceProyecto(proyectoId: any, avanceData: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error: insertError } = await supabase
    .from('avance_proyecto')
    .insert([{ 
      ...avanceData, 
      proyecto_id: proyectoId,
      monto: Number(avanceData.monto) || 0
    }])
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting avance:", insertError);
    throw new Error(insertError.message);
  }

  await recalculateProyectoAvance(proyectoId, supabase, Number(avanceData.monto) || 0);

  revalidatePath('/dashboard/gestion-proyectos');
  return data;
}

export async function updateAvanceProyecto(id: any, avanceData: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error: updateError } = await supabase
    .from('avance_proyecto')
    .update({
      ...avanceData,
      monto: Number(avanceData.monto) || 0
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating avance:", updateError);
    throw new Error(updateError.message);
  }

  if (data?.proyecto_id) {
    await recalculateProyectoAvance(data.proyecto_id, supabase, Number(avanceData.monto) || 0);
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
  try {
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
  } catch (err) {
    console.error("FATAL ERROR getGruposProyectos:", err);
    return [];
  }
}
