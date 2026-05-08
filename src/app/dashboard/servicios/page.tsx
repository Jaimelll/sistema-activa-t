"use client";

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ServiciosKPIs } from '@/components/servicios/ServiciosKPIs';
import { ServiciosFilters } from '@/components/servicios/ServiciosFilters';
import { ServiciosTimeline } from '@/components/servicios/ServiciosTimeline';
import { PeruMapBeneficiariosChart } from '@/components/servicios/PeruMapBeneficiariosChart';
import { ServiciosInstitucionChart } from '@/components/servicios/ServiciosInstitucionChart';

export default function ServiciosPage() {
    const supabase = createClient();

    // ── Raw data ─────────────────────────────────────────────────────────────
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // ── Catalog options (for filter dropdowns) ────────────────────────────────
    const [filterOptions, setFilterOptions] = useState<{
        etapas: { id: number; descripcion: string }[];
        ejes: { id: number; descripcion: string }[];
        lineas: { id: number; descripcion: string }[];
        condiciones: { id: number; descripcion: string }[];
        modalidades: { id: number; descripcion: string }[];
    }>({
        etapas: [],
        ejes: [],
        lineas: [],
        condiciones: [],
        modalidades: [],
    });

    // ── Fase catalog and mapping etapa_id → fase ──────────────────────────────
    const [fases, setFases] = useState<string[]>([]);
    // Maps etapa_id (number) → fase (string) for robust filtering
    const [etapaFaseMap, setEtapaFaseMap] = useState<Record<number, string>>({});

    // ── Timeline options (for ServiciosTimeline) ─────────────────────────────
    const [timelineOptions, setTimelineOptions] = useState<any>({});

    // ── Active filter state (single-select, matches Proyectos pattern) ────────
    const [selectedFase, setSelectedFase] = useState<string>('all');       // Default: Todas las Fases
    const [selectedEtapa, setSelectedEtapa] = useState<string>('all');
    const [selectedEje, setSelectedEje] = useState<string>('all');
    const [selectedLinea, setSelectedLinea] = useState<string>('all');
    const [selectedCondicion, setSelectedCondicion] = useState<string>('all');

    // ── Initial data load ─────────────────────────────────────────────────────
    useEffect(() => {
        async function loadInitialData() {
            setLoading(true);

            const [
                { data: etapasRaw },
                { data: ejes },
                { data: lineas },
                { data: condiciones },
                { data: modalidades },
                { data: instituciones },
                { data: grupos }
            ] = await Promise.all([
                // Fetch full etapas with `fase` field for the mapping
                supabase.from('etapas').select('id, descripcion, fase').order('id'),
                supabase.from('ejes').select('id, descripcion').order('id'),
                supabase.from('lineas').select('id, descripcion').order('id'),
                supabase.from('condicion').select('id, descripcion').order('id'),
                supabase.from('modalidades').select('id, descripcion').order('id'),
                supabase.from('institucion').select('id, descripcion').order('id'),
                supabase.from('grupo').select('id, descripcion, orden').eq('tipo', 1).order('orden')
            ]);

            // Build etapa_id → fase map
            const faseMap: Record<number, string> = {};
            const fasesSet = new Set<string>();
            (etapasRaw || []).forEach((e: any) => {
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

            // Catalog options for filters
            setFilterOptions({
                etapas: (etapasRaw || []).map((e: any) => ({ id: e.id, descripcion: e.descripcion })),
                ejes: (ejes || []).map((e: any) => ({ id: e.id, descripcion: e.descripcion })),
                lineas: (lineas || []).map((e: any) => ({ id: e.id, descripcion: e.descripcion })),
                condiciones: (condiciones || []).map((e: any) => ({ id: e.id, descripcion: e.descripcion })),
                modalidades: (modalidades || []).map((e: any) => ({ id: e.id, descripcion: e.descripcion })),
            });

            // Timeline options (legacy shape expected by ServiciosTimeline)
            const mapToOptions = (arr: any[] | null) =>
                (arr || []).map(item => ({ value: item.id, label: item.descripcion }));
            setTimelineOptions({
                etapas: mapToOptions(etapasRaw),
                ejes: mapToOptions(ejes),
                lineas: mapToOptions(lineas),
                condiciones: mapToOptions(condiciones),
                modalidades: mapToOptions(modalidades),
                instituciones: mapToOptions(instituciones),
                grupos: (grupos || []).map((g: any) => ({
                    value: g.id,
                    label: `${g.orden} - ${g.descripcion}`
                })),
            });

            // Fetch becas with all relations
            const { data: servicios, error } = await supabase
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
                    avances:avance_beca(fecha, etapa_id),
                    grupo:grupo_id(descripcion, orden)
                `)
                .order('id', { ascending: true });

            if (error) {
                console.error('Error fetching servicios:', error);
            } else {
                // Pre-process dates (Unpivot logic)
                const processed = (servicios || []).map((b: any) => {
                    const inicio = b.avances?.find((a: any) => a.etapa_id === 1)?.fecha;
                    const fin = b.avances?.find((a: any) => a.etapa_id === 10)?.fecha;
                    return { ...b, fecha_inicio: inicio, fecha_fin: fin };
                });
                setData(processed);
            }

            setLoading(false);
        }

        loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Available filter options (only IDs present in loaded becas data) ────────
    const availableFilterOptions = useMemo(() => {
        // While data is still loading, show full catalog so selects aren't empty
        if (data.length === 0) return filterOptions;

        const usedEtapaIds   = new Set(data.map(d => d.etapa_id).filter(Boolean));
        const usedEjeIds     = new Set(data.map(d => d.eje_id).filter(Boolean));
        const usedLineaIds   = new Set(data.map(d => d.linea_id).filter(Boolean));
        const usedCondIds    = new Set(data.map(d => d.condicion_id).filter(Boolean));

        return {
            etapas:     filterOptions.etapas.filter(e => usedEtapaIds.has(e.id)),
            ejes:       filterOptions.ejes.filter(e => usedEjeIds.has(e.id)),
            lineas:     filterOptions.lineas.filter(e => usedLineaIds.has(e.id)),
            condiciones: filterOptions.condiciones.filter(e => usedCondIds.has(e.id)),
            modalidades: filterOptions.modalidades,
        };
    }, [data, filterOptions]);

    // ── Filtering Logic ───────────────────────────────────────────────────────
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

            return matchFase && matchEtapa && matchEje && matchLinea && matchCondicion;
        });
    }, [data, etapaFaseMap, selectedFase, selectedEtapa, selectedEje, selectedLinea, selectedCondicion]);

    // ── Derived chart data (reactive to filteredData) ─────────────────────────
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
                institucion: d.institucion?.descripcion || ''
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

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 pb-12">

            {/* Header panel — logo + filters */}
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                {/* Logo */}
                <div className="flex items-center gap-4 flex-shrink-0">
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
                        fases={fases}
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
                    />
                </div>
            </div>

            {/* KPI Cards — reactive to filteredData */}
            <ServiciosKPIs data={filteredData} />

            {/* Línea de Tiempo — receives filteredData so it also respects the fase filter */}
            <div className="w-full">
                <ServiciosTimeline
                    data={filteredData}
                    options={timelineOptions}
                />
            </div>

            {/* Mapa de Beneficiarios */}
            <div className="w-full">
                <PeruMapBeneficiariosChart data={bubbleMapData} />
            </div>

            {/* Distribución por Institución */}
            <div className="w-full">
                <ServiciosInstitucionChart data={institucionData} />
            </div>

        </div>
    );
}
