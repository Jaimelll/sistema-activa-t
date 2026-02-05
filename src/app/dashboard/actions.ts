"use server";

import { createClient } from "@supabase/supabase-js";

export async function getDashboardData(filters?: { periodo?: string; eje?: string; linea?: string; etapa?: string }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseServiceKey) {
    console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing");
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log("Env Check: URL=", supabaseUrl ? supabaseUrl.substring(0, 15) + "..." : "MISSING");

  let query = supabase
    .from('proyectos_servicios')
    .select(`
      *,
      lineas (descripcion),
      ejes (descripcion),
      regiones (descripcion),
      instituciones_ejecutoras (nombre)
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
  applyFilter('linea_id', filters?.linea); // Correct column name from schema check: linea_id

  // Note: 'etapa' maps to 'estado'
  if (filters?.etapa && filters.etapa !== 'all' && filters.etapa !== 'todos') {
    query = query.eq('estado', filters.etapa);
  }

  // --- 3. Status Exclusion (Always applied at end as requested) ---
  // "La exclusión de .not('estado', 'ilike', 'no habilitada') debe estar siempre presente al final"
  query = query.not('estado', 'ilike', 'no habilitada');

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
      etapa: p.estado || 'Sin Etapa', // Map 'estado' (DB) to 'etapa' (Frontend)
      institucion: p.instituciones_ejecutoras?.nombre || 'Sin Institucion',
      estado: p.estado || 'Activo',
      year: year,
      año: Number(p.año) || 0, // Added to satisfy frontend filter requirement
      monto_fondoempleo: Number(p.monto_fondoempleo) || 0,
      monto_contrapartida: Number(p.monto_contrapartida) || 0,
      monto_total: Number(p.monto_total) || 0,
      beneficiarios: Number(p.beneficiarios) || 0
    };
  });

  console.log("Debug Data Sample (Year):", mappedData[0]?.year, "Total Rows:", mappedData.length);
  return mappedData;
}

export async function getLineas() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('lineas')
    .select('id, descripcion, numero')
    .order('numero', { ascending: true });

  if (error) {
    console.error("Error fetching lines:", error);
    return [];
  }

  return data.map((item: any) => ({
    value: item.id, // Revert to UUID as schema confirms linea_id is UUID
    label: `L${item.numero} - ${item.descripcion}`
  }));
}

export async function getEjes() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('ejes')
    .select('id, numero, descripcion')
    .order('numero', { ascending: true });

  if (error) {
    console.error("Error fetching ejes:", error);
    return [];
  }

  return data.map((item: any) => ({
    value: item.id, // Revert to UUID
    label: `${item.numero} - ${item.descripcion}`
  }));
}

export async function fetchDynamicYears() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('--- AUDIT START: fetchDynamicYears (No Cache) ---');

  // Optimize select to only fetch 'año'
  const { data, error } = await supabase
    .from('proyectos_servicios')
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
    .from('proyectos_servicios')
    .select('estado')
    .not('estado', 'ilike', 'no habilitada');

  if (error) {
    console.error("Error fetching stages:", error);
    return [];
  }

  if (!data) return [];

  // Extract unique stages
  const uniqueStages = Array.from(new Set(data.map((d: any) => d.estado)))
    .filter(Boolean)
    .sort();

  return uniqueStages;
}
