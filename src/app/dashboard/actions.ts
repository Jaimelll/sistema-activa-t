
"use server";

import { createClient } from "@/utils/supabase/server";

export async function getDashboardData() {
    const supabase = await createClient();

    // Fetch projects with metrics
    const { data, error } = await supabase
        .from('proyectos')
        .select(`
      id,
      nombre,
      region,
      estado,
      created_at,
      metricas (
        monto_fondoempleo,
        monto_contrapartida,
        beneficiarios,
        monto_total
      )
    `);

    if (error) {
        console.error("Error fetching dashboard data:", error);
        return [];
    }

    // Transformed for easy consumption
    return data.map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        region: p.region || 'Desconocido',
        estado: p.estado || 'Sin Estado',
        year: new Date(p.created_at).getFullYear().toString(),
        // Handle array or single object for metrics depending on relationship type (usually 1:1 implies object or array of 1)
        // Supabase select on 1:many returns array. 'metricas' was defined with FK, assuming 1:1 or 1:many.
        // We'll assume metrics[0] if it exists, or defaults.
        monto_fondoempleo: p.metricas?.[0]?.monto_fondoempleo || 0,
        monto_contrapartida: p.metricas?.[0]?.monto_contrapartida || 0,
        monto_total: p.metricas?.[0]?.monto_total || 0,
        beneficiarios: p.metricas?.[0]?.beneficiarios || 0
    }));
}
