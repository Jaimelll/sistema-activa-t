
"use server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createClient } from "@supabase/supabase-js";

export async function getDashboardData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseServiceKey) {
    console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing");
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('proyectos_servicios')
    .select(`
      *,
      lineas (descripcion),
      ejes (descripcion),
      regiones (descripcion),
      instituciones_ejecutoras (nombre)
    `);

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
      eje: p.ejes?.descripcion || 'Sin Eje',
      institucion: p.instituciones_ejecutoras?.nombre || 'Sin Institucion',
      estado: p.estado || 'Activo',
      year: year,
      monto_fondoempleo: Number(p.monto_fondoempleo) || 0,
      monto_contrapartida: Number(p.monto_contrapartida) || 0,
      monto_total: Number(p.monto_total) || 0,
      beneficiarios: Number(p.beneficiarios) || 0
    };
  });

  console.log("Debug Data Sample (Year):", mappedData[0]?.year, "Total Rows:", mappedData.length);
  return mappedData;
}

export async function getAvailableYears() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('--- AUDIT START: getAvailableYears ---');
  console.log('Consultando tabla: proyectos_servicios (SELECT año)');

  const { data, error } = await supabase
    .from('proyectos_servicios')
    .select('año');

  console.log('Datos crudos recibidos (Length):', data?.length);
  if (data && data.length > 0) {
    console.log('Sample Data:', JSON.stringify(data.slice(0, 5)));
  }
  if (error) console.error('Supabase Error:', error);

  if (error) {
    console.error("Error fetching years:", error);
    return [];
  }

  // Extract unique years using Set, filter nulls
  // Extract unique years using Set, filter nulls and sort
  const uniqueYears = Array.from(new Set((data as any[]).map(d => Number(d.año)))).filter(y => !isNaN(y)).sort((a, b) => b - a);
  return uniqueYears;
}
