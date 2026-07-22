"use client";

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ServiciosKPIs } from '@/components/servicios/ServiciosKPIs';
import { ServiciosFilters } from '@/components/servicios/ServiciosFilters';
import { ServiciosTimeline } from '@/components/servicios/ServiciosTimeline';
import { PeruMapBeneficiariosChart } from '@/components/servicios/PeruMapBeneficiariosChart';
import { ServiciosInstitucionChart } from '@/components/servicios/ServiciosInstitucionChart';
import { ServiciosDemografiaCharts } from '@/components/servicios/ServiciosDemografiaCharts';
import ServicioModal from '@/components/servicios/ServicioModal';
import { getServicioCompletoById } from '@/app/dashboard/gestion-servicios/actions';
import { getInformesImpacto } from '@/app/dashboard/actions';
import { fetchAllRows } from '@/utils/supabase/fetchAll';

export default function ServiciosPage() {
    const supabase = createClient();

    // -- Raw data -------------------------------------------------------------
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // -- Catalog options (for filter dropdowns) --------------------------------
    const [filterOptions, setFilterOptions] = useState<{
        etapas: { id: number; descripcion: string }[];
        ejes: { id: number; descripcion: string }[];
        lineas: { id: number; descripcion: string }[];
        condiciones: { id: number; descripcion: string }[];
        modalidades: { id: number; descripcion: string }[];
        instituciones: { id: number; descripcion: string }[];
        tiposEstudio: { id: number; descripcion: string }[];
        grupos: { id: number; descripcion: string; orden: number }[];
    }>({
        etapas: [],
        ejes: [],
        lineas: [],
        condiciones: [],
        modalidades: [],
        instituciones: [],
        tiposEstudio: [],
        grupos: [],
    });

    // -- Fase catalog and mapping etapa_id -> fase -----------------------------
    const [fases, setFases] = useState<string[]>([]);
    // Maps etapa_id (number) → fase (string) for robust filtering
    const [etapaFaseMap, setEtapaFaseMap] = useState<Record<number, string>>({});

    // -- Timeline options (for ServiciosTimeline) ------------------------------
    const [timelineOptions, setTimelineOptions] = useState<any>({});

    // -- Informes de impacto (definen la etapa Impacto en la línea de tiempo) --
    const [informesImpacto, setInformesImpacto] = useState<any[]>([]);

    // -- Active filter state (single-select, matches Proyectos pattern) ---------
    const [selectedFase, setSelectedFase] = useState<string>('all');       // Default: Todas las Fases
    const [selectedEtapa, setSelectedEtapa] = useState<string>('all');
    const [selectedEje, setSelectedEje] = useState<string>('all');
    const [selectedLinea, setSelectedLinea] = useState<string>('all');
    const [selectedCondicion, setSelectedCondicion] = useState<string>('all');
    const [selectedInstitucion, setSelectedInstitucion] = useState<string>('all');
    const [selectedTipoEstudio, setSelectedTipoEstudio] = useState<string>('all');
    const [selectedGrupo, setSelectedGrupo] = useState<string>('all');

    // -- Modal and loading states for map click --------------------------------
    const [selectedModalServicio, setSelectedModalServicio] = useState<any>(null);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [isLoadingServiceModal, setIsLoadingServiceModal] = useState(false);

    // -- Initial data load -----------------------------------------------------
    useEffect(() => {
        async function loadInitialData() {
            setLoading(true);

            const results = await Promise.all([
                // Fetch full catalogs for robust mapping in modals/history
                supabase.from('etapas').select('id, descripcion, fase').order('id'),
                supabase.from('ejes').select('id, descripcion').order('id'),
                supabase.from('lineas').select('id, descripcion').order('id'),
                supabase.from('condicion').select('id, descripcion').order('id'),
                supabase.from('modalidades').select('id, descripcion').order('id'),
                supabase.from('institucion').select('id, descripcion').order('id'),
                supabase.from('grupo').select('id, descripcion, orden').eq('tipo', 1).order('orden'),
                supabase.from('tipo_estudio').select('id, descripcion').order('id'),
                supabase.from('naturaleza_ie').select('id, descripcion').order('id'),
                supabase.from('formato').select('id, descripcion').order('id'),
                supabase.from('empresas').select('ruc, razon_social').order('razon_social')
            ]);

            // Informes de impacto (tabla compartida con Proyectos, editada en
            // Catálogos). Va por server action y NO por el cliente: la tabla tiene
            // RLS activo y con la anon key devuelve siempre vacío. Se traen todos;
            // la línea de tiempo se queda solo con los grupos de becas que dibuja.
            getInformesImpacto()
                .then(setInformesImpacto)
                .catch(err => console.error('Error fetching informes de impacto:', err));

            const etapasRaw = results[0].data || [];
            const ejes = results[1].data || [];
            const lineas = results[2].data || [];
            const condiciones = results[3].data || [];
            const modalidades = results[4].data || [];
            const instituciones = results[5].data || [];
            const grupos = results[6].data || [];
            const tiposEstudio = results[7].data || [];
            const naturalezasIE = results[8].data || [];
            const formatos = results[9].data || [];
            const empresas = results[10].data || [];

            // Deduplicate (since inner join might return multiple rows per item)
            const dedup = (arr: any[] | null) => {
                if (!arr) return [];
                const map = new Map();
                arr.forEach(item => map.set(item.id || item.ruc, item));
                return Array.from(map.values());
            };
            const dedupEtapas = dedup(etapasRaw);
            const dedupEjes = dedup(ejes);
            const dedupLineas = dedup(lineas);
            const dedupCondiciones = dedup(condiciones);
            const dedupModalidades = dedup(modalidades);
            const dedupInstituciones = dedup(instituciones);
            const dedupGrupos = dedup(grupos);
            const dedupTiposEstudio = dedup(tiposEstudio);
            const dedupNaturalezasIE = dedup(naturalezasIE);
            const dedupFormatos = dedup(formatos);
            const dedupEmpresas = dedup(empresas);

            // Build etapa_id → fase map
            const faseMap: Record<number, string> = {};
            const fasesSet = new Set<string>();
            dedupEtapas.forEach((e: any) => {
                if (e.fase) {
                    faseMap[e.id] = e.fase;
                    fasesSet.add(e.fase);
                }
            });
            setEtapaFaseMap(faseMap);
            // Preserve canonical order defined in spec
            const FASE_ORDER = [
                'Etapa Concursal',
                'Acciones Preparatorias',
                'Ejecución del Proyecto',
                'Cierre Administrativo',
                'Resuelto',
                'Pre-Impacto',
                'Impacto',
            ];
            const sortedFases = FASE_ORDER.filter(f => fasesSet.has(f));
            // Append any DB fases not in the canonical list, preserving flexibility
            fasesSet.forEach(f => { if (!sortedFases.includes(f)) sortedFases.push(f); });
            setFases(sortedFases);

            setFilterOptions({
                etapas: dedupEtapas.map((e: any) => ({ id: e.id, descripcion: e.descripcion })),
                ejes: dedupEjes.map((e: any) => ({ id: e.id, descripcion: e.descripcion })),
                lineas: dedupLineas.map((e: any) => ({ id: e.id, descripcion: e.descripcion })),
                condiciones: dedupCondiciones.map((e: any) => ({ id: e.id, descripcion: e.descripcion })),
                modalidades: dedupModalidades.map((e: any) => ({ id: e.id, descripcion: e.descripcion })),
                instituciones: dedupInstituciones.map((e: any) => ({ id: e.id, descripcion: e.descripcion })),
                tiposEstudio: dedupTiposEstudio.map((e: any) => ({ id: e.id, descripcion: e.descripcion })),
                grupos: dedupGrupos.map((g: any) => ({ id: g.id, descripcion: g.descripcion, orden: g.orden })),
            });

            // Timeline options (legacy shape expected by ServiciosTimeline)
            const mapToOptions = (arr: any[] | null) =>
                (arr || []).map(item => ({ value: item.id || item.ruc, label: item.descripcion || `${item.ruc} - ${item.razon_social}` }));
            setTimelineOptions({
                etapas: mapToOptions(dedupEtapas),
                ejes: mapToOptions(dedupEjes),
                lineas: mapToOptions(dedupLineas),
                condiciones: mapToOptions(dedupCondiciones),
                modalidades: mapToOptions(dedupModalidades),
                instituciones: mapToOptions(dedupInstituciones),
                grupos: dedupGrupos.map((g: any) => ({
                    value: g.id,
                    label: `${g.orden} - ${g.descripcion}`
                })),
                tiposEstudio: mapToOptions(dedupTiposEstudio),
                naturalezasIE: mapToOptions(dedupNaturalezasIE),
                formatos: mapToOptions(dedupFormatos),
                empresas: dedupEmpresas.map((e: any) => ({
                    value: e.ruc,
                    label: `${e.ruc} - ${e.razon_social}`
                }))
            });

            // Fetch becas with all relations (paginado: Supabase corta en 1000 filas por request)
            const { data: servicios, error } = await fetchAllRows((from, to) => supabase
                .from('becas_nueva')
                .select(`
                    *,
                    beneficiarios,
                    region:region_id(id, descripcion),
                    institucion:institucion_id(descripcion),
                    eje:eje_id(descripcion),
                    linea:linea_id(descripcion),
                    etapa:etapa_id(descripcion),
                    condicion:condicion_id(descripcion),
                    avances:avance_beca(id, fecha, etapa_id, sustento, monto),
                    grupo:grupo_id(descripcion, orden)
                `)
                .order('id', { ascending: true })
                .range(from, to));

            if (error) {
                console.error('Error fetching servicios:', error);
            } else {
                // Pre-process dates (Unpivot logic)
                const processed = ((servicios || []) as any[]).map((b: any) => {
                    const inicio = b.avances?.find((a: any) => a.etapa_id === 1)?.fecha;
                    const fin = b.avances?.find((a: any) => a.etapa_id === 10)?.fecha;
                    const fecha_ejecucion = b.avances?.find((a: any) => a.etapa_id === 5)?.fecha;
                    const fecha_ejecutado = b.avances?.find((a: any) => a.etapa_id === 6)?.fecha;
                    return { ...b, fecha_inicio: inicio, fecha_fin: fin, fecha_ejecucion, fecha_ejecutado };
                });
                setData(processed);
            }

            setLoading(false);
        }

        loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // -- Cascading Filtering Logic (Smart Selection) ---------------------------
    const availableFilterOptions = useMemo(() => {
        if (data.length === 0) return { ...filterOptions, fases };

        // Helper to get matching data for all filters EXCEPT the one we are calculating
        const getFilteredSubset = (excludeKey: string) => {
            return data.filter(item => {
                const matchFase = excludeKey === 'fase' || selectedFase === 'all' || etapaFaseMap[item.etapa_id] === selectedFase;
                const matchEtapa = excludeKey === 'etapa' || selectedEtapa === 'all' || String(item.etapa_id) === selectedEtapa;
                const matchEje = excludeKey === 'eje' || selectedEje === 'all' || String(item.eje_id) === selectedEje;
                const matchLinea = excludeKey === 'linea' || selectedLinea === 'all' || String(item.linea_id) === selectedLinea;
                const matchCondicion = excludeKey === 'condicion' || selectedCondicion === 'all' || String(item.condicion_id) === selectedCondicion;
                const matchInstitucion = excludeKey === 'institucion' || selectedInstitucion === 'all' || String(item.institucion_id) === selectedInstitucion;
                const matchTipoEstudio = excludeKey === 'tipoEstudio' || selectedTipoEstudio === 'all' || String(item.tipo_estudio_id) === selectedTipoEstudio;
                const matchGrupo = excludeKey === 'grupo' || selectedGrupo === 'all' || String(item.grupo_id) === selectedGrupo;
                
                return matchFase && matchEtapa && matchEje && matchLinea && matchCondicion && matchInstitucion && matchTipoEstudio && matchGrupo;
            });
        };

        const usedInSubset = (subset: any[], key: string) => new Set(subset.map(d => d[key]).filter(Boolean));

        // Note: For 'fase', it's slightly different as it depends on etapa_id
        const subsetForFase = getFilteredSubset('fase');
        const usedFases = new Set(subsetForFase.map(d => etapaFaseMap[d.etapa_id]).filter(Boolean));

        return {
            fases: fases.filter(f => usedFases.has(f)),
            etapas: filterOptions.etapas.filter(e => usedInSubset(getFilteredSubset('etapa'), 'etapa_id').has(e.id)),
            ejes: filterOptions.ejes.filter(e => usedInSubset(getFilteredSubset('eje'), 'eje_id').has(e.id)),
            lineas: filterOptions.lineas.filter(l => usedInSubset(getFilteredSubset('linea'), 'linea_id').has(l.id)),
            condiciones: filterOptions.condiciones.filter(c => usedInSubset(getFilteredSubset('condicion'), 'condicion_id').has(c.id)),
            instituciones: filterOptions.instituciones.filter(i => usedInSubset(getFilteredSubset('institucion'), 'institucion_id').has(i.id)),
            tiposEstudio: filterOptions.tiposEstudio.filter(t => usedInSubset(getFilteredSubset('tipoEstudio'), 'tipo_estudio_id').has(t.id)),
            grupos: filterOptions.grupos.filter(g => usedInSubset(getFilteredSubset('grupo'), 'grupo_id').has(g.id)),
            modalidades: filterOptions.modalidades,
        };
    }, [data, filterOptions, selectedFase, selectedEtapa, selectedEje, selectedLinea, selectedCondicion, selectedInstitucion, selectedTipoEstudio, selectedGrupo, etapaFaseMap, fases]);

    // -- Filtering Logic -------------------------------------------------------
    const filteredData = useMemo(() => {
        return data.filter(item => {
            // 1. Fase filter — map item.etapa_id through the etapaFaseMap
            const matchFase =
                selectedFase === 'all' ||
                etapaFaseMap[item.etapa_id] === selectedFase;

            // 2. Etapa filter
            const matchEtapa =
                selectedEtapa === 'all' ||
                String(item.etapa_id) === selectedEtapa;

            // 3. Eje filter
            const matchEje =
                selectedEje === 'all' ||
                String(item.eje_id) === selectedEje;

            // 4. Línea filter
            const matchLinea =
                selectedLinea === 'all' ||
                String(item.linea_id) === selectedLinea;

            // 5. Condición filter
            const matchCondicion =
                selectedCondicion === 'all' ||
                String(item.condicion_id) === selectedCondicion;

            // 6. Institución filter
            const matchInstitucion =
                selectedInstitucion === 'all' ||
                String(item.institucion_id) === selectedInstitucion;

            // 7. Tipo de Estudio filter
            const matchTipoEstudio =
                selectedTipoEstudio === 'all' ||
                String(item.tipo_estudio_id) === selectedTipoEstudio;

            // 8. Grupo filter
            const matchGrupo =
                selectedGrupo === 'all' ||
                String(item.grupo_id) === selectedGrupo;

            return matchFase && matchEtapa && matchEje && matchLinea && matchCondicion && matchInstitucion && matchTipoEstudio && matchGrupo;
        });
    }, [data, etapaFaseMap, selectedFase, selectedEtapa, selectedEje, selectedLinea, selectedCondicion, selectedInstitucion, selectedTipoEstudio, selectedGrupo]);

    // -- Derived chart data (reactive to filteredData) -------------------------
    const bubbleMapData = useMemo(() => {
        const map = new Map<number, { regionId: number; regionName: string; count: number; proyectos: any[] }>();
        filteredData.forEach(d => {
            const regionId = d.region_id;
            const regionName = d.region?.descripcion || 'Desconocido';
            if (!regionId) return;
            if (!map.has(regionId)) {
                map.set(regionId, { regionId, regionName, count: 0, proyectos: [] });
            }
            const entry = map.get(regionId)!;
            entry.count += (Number(d.beneficiarios) || 0);
            entry.proyectos.push({
                id: d.id,
                codigo: d.nombre || '',
                nombre: d.nombre || '',
                beneficiarios: Number(d.beneficiarios) || 0,
                institucion: d.institucion?.descripcion || '',
                grupo_id: d.grupo_id,
                nombre_grupo: d.grupo?.descripcion
            });
        });
        return Array.from(map.values());
    }, [filteredData]);

    const institucionData = useMemo(() => {
        const map = new Map<string, { name: string; beneficiaries: number; budget: number }>();
        filteredData.forEach(d => {
            const name = d.institucion?.descripcion || 'Sin Institución';
            if (!map.has(name)) {
                map.set(name, { name, beneficiaries: 0, budget: 0 });
            }
            const entry = map.get(name)!;
            entry.beneficiaries += (Number(d.beneficiarios) || 0);
            entry.budget += (Number(d.presupuesto) || 0);
        });
        return Array.from(map.values())
            .sort((a, b) => b.beneficiaries - a.beneficiaries)
            .slice(0, 15);
    }, [filteredData]);

    const sexoData = useMemo(() => {
        const counts = { 'Masculino': 0, 'Femenino': 0, 'No Especificado': 0 };
        filteredData.forEach(d => {
            const val = d.sexo ? d.sexo.trim().toUpperCase() : null;
            if (val === 'M' || val === 'MASCULINO') counts['Masculino'] += 1;
            else if (val === 'F' || val === 'FEMENINO') counts['Femenino'] += 1;
            else counts['No Especificado'] += 1;
        });
        return [
            { name: 'Masculino', value: counts['Masculino'] },
            { name: 'Femenino', value: counts['Femenino'] },
            { name: 'No Especificado', value: counts['No Especificado'] }
        ].filter(item => item.value > 0);
    }, [filteredData]);

    const edadesData = useMemo(() => {
        const counts = { '< 20 años': 0, '20-25 años': 0, '26-30 años': 0, '> 30 años': 0, 'No Especificado': 0 };
        
        filteredData.forEach(d => {
            if (!d.fecha_nacimiento) {
                counts['No Especificado'] += 1;
                return;
            }
            
            const hoy = new Date();
            const cumpleanos = new Date(d.fecha_nacimiento);
            let edad = hoy.getFullYear() - cumpleanos.getFullYear();
            const mes = hoy.getMonth() - cumpleanos.getMonth();
            if (mes < 0 || (mes === 0 && hoy.getDate() < cumpleanos.getDate())) {
                edad--;
            }
            
            if (isNaN(edad)) {
                counts['No Especificado'] += 1;
            } else if (edad < 20) {
                counts['< 20 años'] += 1;
            } else if (edad >= 20 && edad <= 25) {
                counts['20-25 años'] += 1;
            } else if (edad >= 26 && edad <= 30) {
                counts['26-30 años'] += 1;
            } else {
                counts['> 30 años'] += 1;
            }
        });

        return [
            { name: '< 20 años', value: counts['< 20 años'] },
            { name: '20-25 años', value: counts['20-25 años'] },
            { name: '26-30 años', value: counts['26-30 años'] },
            { name: '> 30 años', value: counts['> 30 años'] },
            { name: 'No Especificado', value: counts['No Especificado'] }
        ].filter(item => item.value > 0);
    }, [filteredData]);

    const handleRegistroClick = async (registroId: number | string) => {
        try {
            setIsLoadingServiceModal(true);
            const fullService = await getServicioCompletoById(Number(registroId));
            if (fullService) {
                setSelectedModalServicio(fullService);
                setIsServiceModalOpen(true);
            } else {
                alert("No se pudieron cargar los detalles del servicio.");
            }
        } catch (error) {
            console.error("Error fetching service details:", error);
            alert("Ocurrió un error al cargar el servicio.");
        } finally {
            setIsLoadingServiceModal(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 pb-12">

            {/* Header panel - logo + filters */}
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                {/* Logo */}
                <div className="flex items-center gap-4 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/fondoempleo.jpg"
                        alt="Fondoempleo"
                        className="h-[85px] object-contain"
                        style={{ filter: 'contrast(1.1) saturate(1.2)' }}
                    />
                </div>

                {/* Filters */}
                <div className="flex-1 w-full">
                    <ServiciosFilters
                        fases={availableFilterOptions.fases || []}
                        selectedFase={selectedFase}
                        setSelectedFase={setSelectedFase}
                        options={availableFilterOptions}
                        selectedEtapa={selectedEtapa}
                        setSelectedEtapa={setSelectedEtapa}
                        selectedEje={selectedEje}
                        setSelectedEje={setSelectedEje}
                        selectedLinea={selectedLinea}
                        setSelectedLinea={setSelectedLinea}
                        selectedCondicion={selectedCondicion}
                        setSelectedCondicion={setSelectedCondicion}
                        selectedInstitucion={selectedInstitucion}
                        setSelectedInstitucion={setSelectedInstitucion}
                        selectedTipoEstudio={selectedTipoEstudio}
                        setSelectedTipoEstudio={setSelectedTipoEstudio}
                        selectedGrupo={selectedGrupo}
                        setSelectedGrupo={setSelectedGrupo}
                    />
                </div>
            </div>

            {/* KPI Cards — reactive to filteredData */}
            <ServiciosKPIs data={filteredData} />

            {/* Línea de Tiempo — receives filteredData so it also respects the fase filter */}
            <div className="w-full" id="servicios-timeline-section">
                <ServiciosTimeline
                    data={filteredData}
                    options={timelineOptions}
                    informesImpacto={informesImpacto}
                />
            </div>

            {/* Mapa de Beneficiarios */}
            <div className="w-full">
                <PeruMapBeneficiariosChart data={bubbleMapData} onRegistroClick={handleRegistroClick} />
            </div>

            {/* Distribución por Institución */}
            <div className="w-full">
                <ServiciosInstitucionChart data={institucionData} />
            </div>

            {/* Demografía: Sexo y Edades */}
            <div className="w-full">
                <ServiciosDemografiaCharts sexoData={sexoData} edadesData={edadesData} />
            </div>

            {/* Servicio Detail Modal */}
            <ServicioModal 
                isOpen={isServiceModalOpen}
                onClose={() => {
                    setIsServiceModalOpen(false);
                    setSelectedModalServicio(null);
                }}
                onSave={async () => {}} // Read-only
                servicio={selectedModalServicio}
                options={timelineOptions}
                isReadOnly={true}
            />

            {/* Premium Loading Spinner with blur backdrop */}
            {isLoadingServiceModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-gray-950/40 backdrop-blur-sm transition-all duration-300">
                    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-6 py-5 rounded-2xl border border-gray-200/50 shadow-2xl flex flex-col items-center gap-3 animate-in zoom-in-95 duration-200">
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-blue-900/30"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-blue-600 animate-spin"></div>
                        </div>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest animate-pulse">
                            Cargando detalles...
                        </span>
                    </div>
                </div>
            )}

        </div>
    );
}
