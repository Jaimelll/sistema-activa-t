"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers de caché para catálogos (líneas, ejes, etc.) — datos que rara vez
// cambian. Revalidación: 1 hora + invalidación por tag.
// Si modificas un catálogo desde un server action, llama:
//     revalidateTag('catalogos');
// y la próxima lectura traerá datos frescos.
// ──────────────────────────────────────────────────────────────────────────────
const CATALOG_REVALIDATE_SECONDS = 3600; // 1 hora
const CATALOG_TAG = "catalogos";


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
        avance_proyecto (
          id,
          fecha,
          etapa_id,
          sustento,
          monto
        ),
        grupo:grupo_id(descripcion)
      `);

    if (filters?.periodo && filters.periodo !== 'all' && filters.periodo !== 'undefined') {
      const yearVal = Number(filters.periodo);
      if (!isNaN(yearVal)) query = query.eq('año', yearVal);
    }

    const applyFilter = (column: string, value?: string | number) => {
      if (value === undefined || value === null) return;
      const valString = String(value).trim();
      const valLower = valString.toLowerCase();
      
      if (valLower === 'all' || valLower === 'undefined' || valLower === '' || valLower.startsWith('tod') || valString === '0') {
        return; // Ignora los filtros vacíos o globales
      }
      
      query = query.eq(column, value);
    };

    applyFilter('eje_id', filters?.eje);
    applyFilter('linea_id', filters?.linea);
    applyFilter('modalidad_id', filters?.modalidad);
    applyFilter('especialista_id', filters?.especialistaId);
    applyFilter('etapa_id', filters?.etapa); 

    query = query.order('id', { ascending: true });

    const { data, error } = await query;

    if (error) {
      return [];
    }

    if (!data || data.length === 0) return [];

    // Filtro seguro en el servidor para evitar el colapso del inner join
    const proyectosValidos = data.filter((p: any) => {
      const desc = p.etapas?.descripcion?.toLowerCase() || '';
      return !desc.includes('no habilitada');
    });

    return proyectosValidos.map((p: any) => {
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
        monto_total: (Number(p.monto_fondoempleo) || 0) + (Number(p.contrapartida) || 0),
        beneficiarios: Number(p.beneficiarios) || 0,
        avance_tecnico: Number(p.avance_tecnico) || 0,
        fecha_inicio: p.avance_proyecto?.find((a: any) => a.etapa_id === 1)?.fecha || null,
        fecha_fin: p.avance_proyecto?.find((a: any) => a.etapa_id === 6)?.fecha || null,
        avances: p.avance_proyecto || [],
        grupo_id: p.grupo_id,
        nombre_grupo: p.grupo?.descripcion || '',
        provincia: p.provincia || '',
        especialista_id: p.especialista_id,
        especialista: p.especialista?.nombre || '',
        contacto: p.contacto || ''
      };
    });
  } catch (err) {
    console.error("FATAL ERROR getDashboardData:", err);
    return [];
  }
}

export async function getGestionProyectosData(filters?: { periodo?: string; eje?: string; linea?: string; etapa?: string; modalidad?: string; especialistaId?: string; grupo_id?: string; id_exacto?: string }) {
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
        id,
        nombre,
        codigo_proyecto,
        año,
        created_at,
        eje_id,
        linea_id,
        region_id,
        etapa_id,
        modalidad_id,
        institucion_ejecutora_id,
        especialista_id,
        grupo_id,
        gestora,
        sustento,
        monto_fondoempleo,
        avance,
        contrapartida,
        beneficiarios,
        avance_tecnico,
        provincia,
        contacto,
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
          monto
        ),
        grupo:grupo_id(descripcion)
      `);

    if (filters?.periodo && filters.periodo !== 'all' && filters.periodo !== 'undefined') {
      const yearVal = Number(filters.periodo);
      if (!isNaN(yearVal)) query = query.eq('año', yearVal);
    }

    const applyFilter = (column: string, value?: string) => {
      if (value && value !== 'all' && value !== 'todos' && value !== 'undefined') {
        query = query.eq(column, value);
      }
    };

    applyFilter('eje_id', filters?.eje);
    applyFilter('linea_id', filters?.linea);
    applyFilter('modalidad_id', filters?.modalidad);
    applyFilter('especialista_id', filters?.especialistaId);

    if (filters?.grupo_id && filters.grupo_id !== 'all' && filters.grupo_id !== '' && filters.grupo_id !== 'undefined') {
      query = query.eq('grupo_id', filters.grupo_id);
    }

    if (filters?.id_exacto && filters.id_exacto !== '' && filters.id_exacto !== 'undefined') {
      query = query.eq('id', filters.id_exacto);
    }

    if (filters?.etapa && filters.etapa !== 'all' && filters.etapa !== 'todos' && filters.etapa !== 'undefined') {
      query = query.eq('etapa_id', filters.etapa);
    }

    if (filters?.especialistaId && Number(filters.especialistaId) !== 0 && filters.especialistaId !== 'undefined') {
      query = query.eq('especialista_id', filters.especialistaId);
    }

    query = query.not('etapas.descripcion', 'ilike', 'no habilitada').order('id', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching gestion proyectos data:", error.message || error.details || error);
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
        monto_total: (Number(p.monto_fondoempleo) || 0) + (Number(p.contrapartida) || 0),
        beneficiarios: Number(p.beneficiarios) || 0,
        avance_tecnico: Number(p.avance_tecnico) || 0,
        fecha_inicio: p.avance_proyecto?.find((a: any) => a.etapa_id === 1)?.fecha || null,
        fecha_fin: p.avance_proyecto?.find((a: any) => a.etapa_id === 6)?.fecha || null,
        avances: p.avance_proyecto || [],
        grupo_id: p.grupo_id,
        nombre_grupo: p.grupo?.descripcion || '',
        provincia: p.provincia || '',
        especialista_id: p.especialista_id,
        especialista: p.especialista?.nombre || '',
        contacto: p.contacto || ''
      };
    });
  } catch (err) {
    console.error("FATAL ERROR getGestionProyectosData:", err);
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
      especialista: p.especialista?.nombre || '',
      contacto: p.contacto || ''
    };
  } catch (err) {
    console.error("FATAL ERROR getProyectoCompletoById:", err);
    return null;
  }
}

const _getLineas = unstable_cache(
  async () => {
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
  },
  ['catalog:lineas'],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);
export async function getLineas() { return _getLineas(); }

const _getEjes = unstable_cache(
  async () => {
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
  },
  ['catalog:ejes'],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);
export async function getEjes() { return _getEjes(); }

const _getModalidades = unstable_cache(
  async () => {
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
  },
  ['catalog:modalidades'],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);
export async function getModalidades() { return _getModalidades(); }

const _getEspecialistas = unstable_cache(
  async () => {
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
  },
  ['catalog:especialistas'],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);
export async function getEspecialistas() { return _getEspecialistas(); }

const _fetchDynamicYears = unstable_cache(
  async () => {
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
  },
  ['catalog:years'],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);
export async function fetchDynamicYears() { return _fetchDynamicYears(); }

const _getEtapas = unstable_cache(
  async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data, error } = await supabase
        .from('etapas')
        .select('id, descripcion')
        .not('descripcion', 'ilike', 'no habilitada')
        .order('id', { ascending: true });

      if (error) {
        console.error("Error fetching stages:", error);
        return [];
      }

      if (!data) return [];
      // Mantener el orden del .order('id') eliminando duplicados si los hubiera
      const uniqueDescriptions: string[] = [];
      const seen = new Set();
      data.forEach((d: any) => {
        if (d.descripcion && !seen.has(d.descripcion)) {
          seen.add(d.descripcion);
          uniqueDescriptions.push(d.descripcion);
        }
      });
      return uniqueDescriptions;
    } catch (err) {
      console.error("FATAL ERROR getEtapas:", err);
      return [];
    }
  },
  ['catalog:etapas'],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);
export async function getEtapas() { return _getEtapas(); }

const _getEtapasList = unstable_cache(
  async () => {
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
  },
  ['catalog:etapas-list'],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);
export async function getEtapasList() { return _getEtapasList(); }

const _getFasesOptions = unstable_cache(
  async () => {
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
  },
  ['catalog:fases'],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);
export async function getFasesOptions() { return _getFasesOptions(); }


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
        avance_tecnico, provincia, especialista_id, contacto,
        especialista:especialistas(nombre),
        avance_proyecto (id, fecha, etapa_id, sustento)
      `);

    if (especialistaId && Number(especialistaId) !== 0 && String(especialistaId) !== 'all' && String(especialistaId) !== 'undefined') {
      query = query.eq('especialista_id', especialistaId);
    }

    const { data, error } = await query
      .order('id', { ascending: true });

    if (error) {
      console.error("Error Timeline:", error);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Filtro seguro en memoria para evitar colapso del inner join
    const proyectosValidos = data.filter((p: any) => {
      const desc = p.etapas?.descripcion?.toLowerCase() || '';
      return !desc.includes('no habilitada');
    });

    return proyectosValidos.map((p: any) => ({
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
      fecha_inicio: p.avance_proyecto?.find((a: any) => a.etapa_id === 1)?.fecha || null,
      fecha_fin: p.avance_proyecto?.find((a: any) => a.etapa_id === 6)?.fecha || null,
      avances: (p.avance_proyecto || []).map((a: any) => ({
        id: a.id,
        fecha: a.fecha,
        etapa_id: a.etapa_id,
        sustento: a.sustento || ''
      })),
      provincia: p.provincia || '',
      especialista_id: p.especialista_id,
      especialista: p.especialista?.nombre || '',
      contacto: p.contacto || ''
    }));
  } catch (err) {
    console.error("FATAL ERROR getTimelineData:", err);
    return [];
  }
}

// --- SALDOS BANCARIOS POR BANCO (editados desde Catálogos) ---

const _getSaldosBancarios = unstable_cache(
  async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // select('*'): el parser de tipos de supabase-js no soporta la "ñ" de "año"
      // en la lista de columnas.
      const { data, error } = await supabase
        .from('saldo_bancario')
        .select('*')
        .order('año', { ascending: true })
        .order('monto', { ascending: false });

      if (error) {
        // La tabla puede no existir aún (se crea por SQL): degradar sin romper la página.
        console.error("Error fetching saldos bancarios:", error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error("FATAL ERROR getSaldosBancarios:", err);
      return [];
    }
  },
  ['catalog:saldos-bancarios'],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] } // ediciones desde Catálogos lo invalidan
);
export async function getSaldosBancarios() { return _getSaldosBancarios(); }

// --- INFORMES DE IMPACTO (por grupo, editados desde Catálogos) ---

const _getInformesImpacto = unstable_cache(
  async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data, error } = await supabase
        .from('informe_impacto')
        .select('id, grupo_id, linea_id, titulo, fecha_inicio, fecha_fin, archivo_url')
        .order('fecha_inicio', { ascending: true });

      if (error) {
        // La tabla puede no existir aún (se crea por SQL): degradar sin romper el dashboard.
        console.error("Error fetching informes de impacto:", error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error("FATAL ERROR getInformesImpacto:", err);
      return [];
    }
  },
  ['catalog:informes-impacto'],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] } // ediciones desde Catálogos lo invalidan
);
export async function getInformesImpacto() { return _getInformesImpacto(); }

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

// --- PROYECTOS CRUD ACTIONS ---

export async function createProyecto(formData: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // proyectos.id no tiene default/secuencia en la BD: se asigna max(id)+1.
  // Si dos altas simultáneas chocan (23505), se reintenta con el nuevo máximo.
  let data: any = null;
  let lastError: any = null;
  for (let intento = 0; intento < 3; intento++) {
    const { data: maxRow, error: maxError } = await supabase
      .from('proyectos')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError) {
      console.error("Error obteniendo máximo id de proyectos:", maxError);
      throw new Error(maxError.message);
    }

    const payload = { ...formData, id: (Number(maxRow?.id) || 0) + 1 };
    const { data: inserted, error } = await supabase
      .from('proyectos')
      .insert([payload])
      .select();

    if (!error) { data = inserted; lastError = null; break; }
    lastError = error;
    if (error.code !== '23505') break; // solo reintentar por id duplicado
  }

  if (lastError) {
    console.error("Error creating proyecto:", lastError);
    throw new Error(lastError.message);
  }

  revalidatePath('/dashboard/gestion-proyectos');
  revalidateTag(CATALOG_TAG, 'max'); // años, grupos podrían haber cambiado (Next 16 exige el 2º arg; 'max' preserva el comportamiento previo)
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
  revalidateTag(CATALOG_TAG, 'max'); // años, grupos podrían haber cambiado (Next 16 exige el 2º arg; 'max' preserva el comportamiento previo)
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
  revalidateTag(CATALOG_TAG, 'max'); // años, grupos podrían haber cambiado (Next 16 exige el 2º arg; 'max' preserva el comportamiento previo)
  return { success: true };
}

const _getInstituciones = unstable_cache(
  async () => {
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
  },
  ['catalog:instituciones'],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);
export async function getInstituciones() { return _getInstituciones(); }

const _getRegiones = unstable_cache(
  async () => {
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
  },
  ['catalog:regiones'],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);
export async function getRegiones() { return _getRegiones(); }

// --- AVANCE PROYECTO ACTIONS ---

async function recalculateProyectoAvance(proyectoId: any, supabase: any, currentMonto?: number) {
  const today = new Date().toISOString().split('T')[0];
  
  // 1. Obtener TODO el historial de avances para este proyecto
  const { data: allAvances, error: fetchError } = await supabase
    .from('avance_proyecto')
    .select('etapa_id, sustento, fecha, monto')
    .eq('proyecto_id', proyectoId)
    .lte('fecha', today)                 // 2. Filtrar fecha <= hoy (ignora proyecciones)
    .order('fecha', { ascending: false }) // 3. Ordenar por fecha descendente
    .order('id', { ascending: false });

  if (fetchError) {
    console.error("Error al obtener historial para sincronización:", fetchError);
    return;
  }

  if (allAvances && allAvances.length > 0) {
    // 4. El avance más reciente (índice 0) define la etapa actual
    const latestAvance = allAvances[0];
    const newEtapaId = latestAvance.etapa_id;

    // 5. Asigna como sustento el texto del avance más reciente. Si está vacío, busca hacia atrás.
    const sustentoFinal = allAvances.find((av: any) => av.sustento && av.sustento.trim() !== '')?.sustento || '';

    // Calculamos el avance financiero total (solo de avances reales <= hoy)
    const totalAvanceFinanciero = allAvances.reduce((sum: number, item: any) => sum + (Number(item.monto) || 0), 0);

    // Actualizamos el proyecto padre
    const { error: updateError } = await supabase
      .from('proyectos')
      .update({ 
        etapa_id: newEtapaId,
        sustento: sustentoFinal,
        avance: totalAvanceFinanciero
      })
      .eq('id', proyectoId);

    if (updateError) {
      console.error("Error al sincronizar proyecto padre:", updateError);
    }
    
    // 6. CRÍTICO: Limpiar caché de Next.js
    revalidatePath('/dashboard/gestion-proyectos');
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

const _getGruposProyectos = unstable_cache(
  async () => {
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
  },
  ['catalog:grupos'],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);
export async function getGruposProyectos() { return _getGruposProyectos(); }
