
"use server";

import { createClient } from "@supabase/supabase-js";

export async function getDashboardData() {
  // Use Service Role Key to bypass RLS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseServiceKey) {
    console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in .env");
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Select projects and join metrics
  const { data, error } = await supabase
    .from('proyectos')
    .select('*, metricas(*)');

  if (error) {
    console.error("Error fetching dashboard data:", error);
    return [];
  }

  // Debug log
  console.log("--- DEBUG DASHBOARD DATA ---");
  if (data && data.length > 0) {
    console.log("First record keys:", Object.keys(data[0]));
    // Log first record to see structure (including nested metricas)
    console.log("First record sample:", JSON.stringify(data[0], null, 2));
  } else {
    console.log("No data returned from Supabase.");
  }
  console.log("----------------------------");

  if (!data || data.length === 0) {
    return [];
  }

  /*
    Mapping based on User request:
    Filtro: Año, Región, Nombre de la Institución:
    Valores: FONDOEMPLEO, Contrapartidas, TOTAL, BENEFICIARIOS
  */

  return data.map((p: any) => {
    // Flatten metrica if exists
    const m = Array.isArray(p.metricas) && p.metricas.length > 0 ? p.metricas[0] : (p.metricas || {});

    // Helper to safely get string from project
    const getStr = (obj: any, keys: string[], defaultVal = '') => {
      for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) return String(obj[k]);
      }
      return defaultVal;
    };

    // Helper to safely get number from metrics (or project if needed)
    const getNum = (obj: any, keys: string[]) => {
      for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) {
          const val = Number(obj[k]);
          if (!isNaN(val)) return val;
        }
      }
      return 0;
    };

    // Mappings
    const nombre = getStr(p, ['Nombre de la Institución:', 'Nombre de la Institución', 'nombre'], 'Sin Nombre');
    const region = getStr(p, ['Región', 'región', 'region'], 'Desconocido');
    // Extract year from created_at if Year column is missing
    let year = getStr(p, ['Año', 'año', 'Year', 'year']);
    if (!year && p.created_at) {
      year = new Date(p.created_at).getFullYear().toString();
    } else if (!year) {
      year = new Date().getFullYear().toString();
    }
    const estado = getStr(p, ['Estado', 'estado'], 'Activo');

    // Metrics are likely in the joined table 'metricas', map from 'm'
    const fondoempleo = getNum(m, ['monto_fondoempleo', 'FONDOEMPLEO', 'fondoempleo']);
    const contrapartidas = getNum(m, ['monto_contrapartida', 'Contrapartidas', 'contrapartidas']);
    const total = getNum(m, ['monto_total', 'TOTAL', 'total']);
    const beneficiarios = getNum(m, ['beneficiarios', 'BENEFICIARIOS']);

    return {
      id: p.id || Math.random(),
      nombre,
      region,
      estado,
      year,
      monto_fondoempleo: fondoempleo,
      monto_contrapartida: contrapartidas,
      monto_total: total,
      beneficiarios
    };
  });
}
