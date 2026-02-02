
"use server";

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

  // Map to flattened structure
  return data.map((p: any) => {
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
}
