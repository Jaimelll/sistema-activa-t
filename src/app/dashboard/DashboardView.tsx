"use client";
// Force Update: 2026-04-14 MAP-BUBBLE-v2

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { KPICard } from '@/components/dashboard/KPICard';
import { getDashboardStats, getTimelineData, getRegionData, getInstitucionData, getProyectoCompletoById } from './actions';
import { FundingChart } from '@/components/dashboard/charts/FundingChart';
import { StatusChart } from '@/components/dashboard/charts/StatusChart';
import { EjeChart } from '@/components/dashboard/charts/EjeChart';
import { DollarSign, FileText, CheckCircle, TrendingUp, Filter, Users, LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { clsx } from 'clsx';
import { GestoraChart } from '@/components/dashboard/charts/GestoraChart';
import ProyectoModal from '@/components/ProyectoModal';

// ── Lazy load de componentes pesados ─────────────────────────────────────────
// PeruMapChart (~540 líneas de SVG + lógica) y TimelineChart (~519 líneas con
// recharts) se descargan como chunks separados, reduciendo el bundle inicial
// del dashboard.
const TimelineChart = dynamic(
    () => import('@/components/dashboard/charts/TimelineChart').then(m => ({ default: m.TimelineChart })),
    {
        ssr: false,
        loading: () => <div className="h-80 w-full bg-gray-50 animate-pulse rounded-lg" />,
    }
);
const PeruMapChart = dynamic(
    () => import('@/components/dashboard/charts/PeruMapChart').then(m => ({ default: m.PeruMapChart })),
    {
        ssr: false,
        loading: () => <div className="h-96 w-full bg-gray-50 animate-pulse rounded-lg" />,
    }
);

interface DashboardViewProps {
    initialData: any[];
    years?: any[]; // Changed to allow objects {value, label}
    stages?: string[];
    lines?: any[];
    ejesList?: any[];
    timelineData?: any[];
    modalidades?: any[];
    instituciones?: any[];
    regiones?: any[];
    etapasList?: any[];
    grupos?: any[];
    especialistas?: any[];
    fases?: string[];
}

export default function DashboardView({ initialData, timelineData = [], years = [], stages = [], lines = [], ejesList = [], modalidades = [], instituciones = [], regiones = [], etapasList = [], grupos = [], especialistas = [], fases = [] }: DashboardViewProps) {

    // State for filters
    const [selectedYear, setSelectedYear] = useState<any>(''); // Default empty for 'All'
    const [selectedLinea, setSelectedLinea] = useState<any>('all');
    const [selectedEje, setSelectedEje] = useState<any>('all');
    const [selectedEtapa, setSelectedEtapa] = useState<any>('all');
    const [selectedModalidad, setSelectedModalidad] = useState<any>('all');
    const [selectedFase, setSelectedFase] = useState<any>("En Ejecución");
    const [selectedRegion, setSelectedRegion] = useState<any>(null);
    const [selectedEspecialista, setSelectedEspecialista] = useState<any>('all');
    const [dashboardData, setDashboardData] = useState(initialData);
    const [timelineDataState, setTimelineDataState] = useState(timelineData);
    const [isInitialMount, setIsInitialMount] = useState(true);

    // States for project details modal from map tooltip
    const [selectedModalProyecto, setSelectedModalProyecto] = useState<any>(null);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isLoadingProjectModal, setIsLoadingProjectModal] = useState(false);

    const handleFundingBarClick = (region: string) => {
        setSelectedRegion(region === selectedRegion ? null : region);
    };

    // Use passed years directly - NO LOGIC HERE
    // years prop comes from server as sorted number array or objects



    // Helper helper to check if a filter state is a global default ("All", "Todos", empty, undefined, etc.)
    const isIgnored = (val: any) => {
        if (val === undefined || val === null) return true;
        const str = String(val).trim().toLowerCase();
        return str === '' || str === 'all' || str === 'undefined' || str.startsWith('tod') || str === '0';
    };

    // Main Filter Logic (Applied to Data)
    const filteredData = useMemo(() => {
        const res = dashboardData.filter(item => {
            const matchYear = isIgnored(selectedYear) || String(item.año) === String(selectedYear);

            const matchLinea = isIgnored(selectedLinea) || String(item.lineaId) === String(selectedLinea);
            const matchEje = isIgnored(selectedEje) || String(item.ejeId || item.eje_id || item.eje) === String(selectedEje);
            const matchEtapa = isIgnored(selectedEtapa) || String(item.etapaId) === String(selectedEtapa);

            const matchModalidad = isIgnored(selectedModalidad) || String(item.modalidadId) === String(selectedModalidad);
            const matchFase = isIgnored(selectedFase) || item.fase === selectedFase;

            return matchYear && matchLinea && matchEje && matchEtapa && matchFase && matchModalidad;
        });
        return res;
    }, [dashboardData, selectedYear, selectedLinea, selectedEje, selectedEtapa, selectedFase, selectedModalidad]);

    // REACTIVE GLOBAL FILTER EFFECT
    useEffect(() => {
        if (isInitialMount) {
            setIsInitialMount(false);
            return;
        }

        async function refreshDashboardData() {
            const id = isIgnored(selectedEspecialista) ? undefined : Number(selectedEspecialista);
            
            // As requested, calling specific functions reactively
            const [statsRes, timelineRes, regionRes, institucionRes] = await Promise.all([
                getDashboardStats(id),
                getTimelineData(id),
                getRegionData(id),
                getInstitucionData(id)
            ]);

            // Note: In this architecture, statsRes, regionRes, and institucionRes 
            // all provide the raw projects for client-side filtering.
            setDashboardData(statsRes);
            setTimelineDataState(timelineRes);
        }

        refreshDashboardData();
    }, [selectedEspecialista]);

    // Filter Logic for Options (Dynamic Lists) - "No Empty Results" implementation
    const availableFilters = useMemo(() => {
        // Para cada filtro, calculamos sus opciones disponibles filtrando la data con TODOS LOS DEMÁS filtros.
        
        // 1. Opciones de Ejes (dependen de Año, Fase, Línea, Etapa, Modalidad)
        const dataForEjes = dashboardData.filter(item => {
            const matchYear = isIgnored(selectedYear) || String(item.año) === String(selectedYear);
            const matchFase = isIgnored(selectedFase) || item.fase === selectedFase;
            const matchLinea = isIgnored(selectedLinea) || String(item.lineaId) === String(selectedLinea);
            const matchEtapa = isIgnored(selectedEtapa) || String(item.etapaId) === String(selectedEtapa);
            const matchModalidad = isIgnored(selectedModalidad) || String(item.modalidadId) === String(selectedModalidad);
            return matchYear && matchFase && matchLinea && matchEtapa && matchModalidad;
        });
        const uniqueEjes = Array.from(new Set(dataForEjes.map(d => String(d.ejeId || d.eje_id || d.eje))));
        const dynamicEjes = ejesList
            .filter((e: any) => uniqueEjes.includes(String(e.value)))
            .sort((a: any, b: any) => a.label.localeCompare(b.label));

        // 2. Opciones de Líneas (dependen de Año, Fase, Eje, Etapa, Modalidad)
        const dataForLineas = dashboardData.filter(item => {
            const matchYear = isIgnored(selectedYear) || String(item.año) === String(selectedYear);
            const matchFase = isIgnored(selectedFase) || item.fase === selectedFase;
            const matchEje = isIgnored(selectedEje) || String(item.ejeId || item.eje_id || item.eje) === String(selectedEje);
            const matchEtapa = isIgnored(selectedEtapa) || String(item.etapaId) === String(selectedEtapa);
            const matchModalidad = isIgnored(selectedModalidad) || String(item.modalidadId) === String(selectedModalidad);
            return matchYear && matchFase && matchEje && matchEtapa && matchModalidad;
        });
        const uniqueLineas = Array.from(new Set(dataForLineas.map(d => String(d.lineaId))));
        const dynamicLineas = lines
            .filter((l: any) => uniqueLineas.includes(String(l.value)))
            .sort((a: any, b: any) => a.label.localeCompare(b.label));

        // 3. Opciones de Etapas (dependen de Año, Fase, Eje, Línea, Modalidad)
        const dataForEtapas = dashboardData.filter(item => {
            const matchYear = isIgnored(selectedYear) || String(item.año) === String(selectedYear);
            const matchFase = isIgnored(selectedFase) || item.fase === selectedFase;
            const matchEje = isIgnored(selectedEje) || String(item.ejeId || item.eje_id || item.eje) === String(selectedEje);
            const matchLinea = isIgnored(selectedLinea) || String(item.lineaId) === String(selectedLinea);
            const matchModalidad = isIgnored(selectedModalidad) || String(item.modalidadId) === String(selectedModalidad);
            return matchYear && matchFase && matchEje && matchLinea && matchModalidad;
        });
        const uniqueEtapasSet = new Set(dataForEtapas.filter(d => d.etapaId).map(d => JSON.stringify({ value: String(d.etapaId), label: String(d.etapa) })));
        const uniqueEtapas = Array.from(uniqueEtapasSet)
            .map(e => JSON.parse(e))
            .sort((a: any, b: any) => Number(a.value) - Number(b.value));

        // 4. Opciones de Fases (dependen de Año, Eje, Línea, Etapa, Modalidad)
        const dataForFases = dashboardData.filter(item => {
            const matchYear = isIgnored(selectedYear) || String(item.año) === String(selectedYear);
            const matchEje = isIgnored(selectedEje) || String(item.ejeId || item.eje_id || item.eje) === String(selectedEje);
            const matchLinea = isIgnored(selectedLinea) || String(item.lineaId) === String(selectedLinea);
            const matchEtapa = isIgnored(selectedEtapa) || String(item.etapaId) === String(selectedEtapa);
            const matchModalidad = isIgnored(selectedModalidad) || String(item.modalidadId) === String(selectedModalidad);
            return matchYear && matchEje && matchLinea && matchEtapa && matchModalidad;
        });
        const dynamicFases = Array.from(new Set(dataForFases.map(d => d.fase).filter(Boolean)))
            .sort((a, b) => {
                const indexA = fases.indexOf(a);
                const indexB = fases.indexOf(b);
                if (indexA === -1 && indexB === -1) return a.localeCompare(b);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });

        // 5. Opciones de Modalidades (dependen de Año, Fase, Eje, Línea, Etapa)
        const dataForModalidades = dashboardData.filter(item => {
            const matchYear = isIgnored(selectedYear) || String(item.año) === String(selectedYear);
            const matchFase = isIgnored(selectedFase) || item.fase === selectedFase;
            const matchEje = isIgnored(selectedEje) || String(item.ejeId || item.eje_id || item.eje) === String(selectedEje);
            const matchLinea = isIgnored(selectedLinea) || String(item.lineaId) === String(selectedLinea);
            const matchEtapa = isIgnored(selectedEtapa) || String(item.etapaId) === String(selectedEtapa);
            return matchYear && matchFase && matchEje && matchLinea && matchEtapa;
        });
        const uniqueModalidades = Array.from(new Set(dataForModalidades.map(d => String(d.modalidadId))));
        const dynamicModalidades = modalidades
            .filter((m: any) => uniqueModalidades.includes(String(m.value)))
            .sort((a: any, b: any) => a.label.localeCompare(b.label));

        return { dynamicLineas, dynamicEjes, uniqueEtapas, dynamicFases, dynamicModalidades };
    }, [dashboardData, selectedYear, selectedFase, selectedLinea, selectedEje, selectedEtapa, selectedModalidad, lines, ejesList, modalidades, fases]);

    // Aggregate Metrics - FORCE SUM (Simplified)
    const metrics = useMemo(() => {
        const totalFondo = filteredData.reduce((acc, curr) => acc + (Number(curr.monto_fondoempleo) || 0), 0);
        const totalContra = filteredData.reduce((acc, curr) => acc + (Number(curr.avance) || 0), 0);
        const totalBen = filteredData.reduce((acc, curr) => acc + (Number(curr.beneficiarios) || 0), 0);
        const totalProjects = filteredData.length;

        const promProj = totalProjects > 0 ? (totalFondo / totalProjects) : 0;
        const promBen = totalBen > 0 ? (totalFondo / totalBen) : 0;
        const percAvance = totalFondo > 0 ? (totalContra / totalFondo) * 100 : 0;

        return {
            totalFondo,
            totalContra,
            totalProjects,
            totalBeneficiaries: totalBen,
            promProj,
            promBen,
            percAvance
        };
    }, [filteredData]);

    // Chart Data
    const fundingByRegion = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            const r = d.region;
            if (!map.has(r)) map.set(r, { name: r, fondoempleo: 0, contrapartida: 0, proyectos: 0, etapa: d.etapa });
            const entry = map.get(r);
            entry.fondoempleo += (Number(d.monto_fondoempleo) || 0);
            entry.contrapartida += (Number(d.avance) || 0);
            entry.proyectos += 1;
            // Si hay múltiples proyectos en la región, la etapa se muestra del último o se simplifica.
            // Para regiones, suele haber una etapa predominante o se muestra la del registro actual.
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredData]);

    // Bubble Map Data — agrupado por región, excluyendo regiones no geográficas
    const bubbleMapData = useMemo(() => {
        const map = new Map<any, { regionId: any; regionName: string; count: number; proyectos: { id: number; codigo: string; nombre: string; contacto?: string; institucion?: string; grupo_id?: any; nombre_grupo?: string }[] }>();
        filteredData.forEach(d => {
            const key = d.regionId ?? d.region;
            if (!map.has(key)) {
                map.set(key, {
                    regionId: d.regionId,
                    regionName: d.region || 'Desconocido',
                    count: 0,
                    proyectos: [],
                });
            }
            const entry = map.get(key)!;
            entry.count += 1;
            entry.proyectos.push({
                id: d.id,
                codigo: d.codigo_proyecto || d.codigo || '',
                nombre: d.nombre || '',
                contacto: d.contacto || '',
                institucion: d.institucion || '',
                grupo_id: d.grupo_id,
                nombre_grupo: d.nombre_grupo,
            });
        });
        return Array.from(map.values());
    }, [filteredData]);

    const projectsByStatus = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            const s = d.estado;
            const id = d.etapaId || d.etapa_id || 0;
            if (!map.has(s)) map.set(s, { count: 0, financing: 0, id });
            const entry = map.get(s);
            entry.count += 1;
            entry.financing += (Number(d.monto_fondoempleo) || 0);
            if (!entry.id && id) entry.id = id;
        });
        return Array.from(map.entries()).map(([name, data]: any) => ({
            name: `${data.id} - ${name}`,
            value: data.count,
            financing: data.financing,
            tooltipName: `Estado ${data.id}`
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredData]);

    const projectsByEje = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            const eid = d.ejeId || d.eje_id || d.eje;
            if (!map.has(eid)) map.set(eid, { count: 0, financing: 0 });
            const entry = map.get(eid);
            entry.count += 1;
            entry.financing += (Number(d.monto_fondoempleo) || 0);
        });

        // Map ID to Label from ejesList
        return Array.from(map.entries()).map(([id, data]: any) => {
            const ejeObj = ejesList.find((e: any) => e.value === id || e.id === id);
            const name = ejeObj ? `E${ejeObj.label}` : `E${id}`;
            return {
                name,
                value: data.count,
                financing: data.financing,
                tooltipName: `Eje ${id}`
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredData, ejesList]);

    const projectsByLinea = useMemo(() => {
        const map = new Map();
        filteredData.forEach(d => {
            const lid = d.lineaId || d.linea_id || d.linea;
            if (!map.has(lid)) map.set(lid, { count: 0, financing: 0 });
            const entry = map.get(lid);
            entry.count += 1;
            entry.financing += (Number(d.monto_fondoempleo) || 0);
        });

        return Array.from(map.entries()).map(([id, data]: any) => {
            const lineaObj = lines.find((l: any) => l.value === id || l.id === id);
            const name = lineaObj ? lineaObj.label : `Línea ${id}`;
            return {
                name,
                value: data.count,
                financing: data.financing,
                tooltipName: `Línea ${id}`
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredData, lines]);



    const gestoraData = useMemo(() => {
        const map = new Map();
        // Filter by existence of gestora field AND modality ID = 2 (Indirecta)
        const indirectData = filteredData.filter(d =>
            d.gestora &&
            d.gestora.trim() !== '' &&
            Number(d.modalidadId) === 2
        );


        indirectData.forEach(d => {
            const name = d.gestora;
            if (!map.has(name)) map.set(name, { name, value: 0, count: 0 });
            const entry = map.get(name);
            entry.value += (Number(d.monto_fondoempleo) || 0);
            entry.count += 1;
        });

        return Array.from(map.values())
            .map((item: any) => ({
                name: `${item.name} (${item.count})`,
                value: item.value,
                count: item.count
            }))
            .sort((a, b) => b.value - a.value);
    }, [filteredData]);

    // Linkage Fix: Filter timelineData based on filteredData IDs
    const filteredTimelineData = useMemo(() => {
        const activeIds = new Set(filteredData.map(d => d.id));
        return timelineDataState.filter(t => activeIds.has(t.id));
    }, [filteredData, timelineDataState]);

    const selectedFaseLabel = useMemo(() => {
        if (selectedEtapa !== 'all') {
            const etapa = availableFilters.uniqueEtapas.find((e: any) => String(e.value) === String(selectedEtapa));
            return etapa ? etapa.label : 'Etapa Seleccionada';
        }
        return selectedFase || 'Todas las Fases';
    }, [selectedEtapa, selectedFase, availableFilters.uniqueEtapas]);

    const handleProyectoClick = async (proyectoId: number) => {
        try {
            setIsLoadingProjectModal(true);
            const fullProject = await getProyectoCompletoById(String(proyectoId));
            if (fullProject) {
                setSelectedModalProyecto(fullProject);
                setIsProjectModalOpen(true);
            } else {
                alert("No se pudieron cargar los detalles del proyecto.");
            }
        } catch (error) {
            console.error("Error fetching project details:", error);
            alert("Ocurrió un error al cargar el proyecto.");
        } finally {
            setIsLoadingProjectModal(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            {/* Header & Filters */}
            <div className="flex flex-col space-y-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 animate-pulse">
                        Fase Activa: {selectedFaseLabel}
                    </div>
                </div>

                {/* Fila Superior: Branding + Filtros (Responsive) */}
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">

                    <div className="flex items-center gap-4 flex-shrink-0">
                        <img
                            src="/fondoempleo.jpg"
                            alt="Fondoempleo"
                            className="h-[85px] object-contain"
                            style={{
                                filter: 'contrast(1.1) saturate(1.2) drop-shadow(0 0 0px transparent)',
                                imageRendering: 'crisp-edges'
                            }}
                        />
                    </div>

                    {/* 2. Contenedor de Filtros (Grid Responsive) */}
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                        {/* 1. Fase */}
                        <select
                            className="input h-10 py-2 px-3 text-sm border-2 border-blue-600 w-full font-bold text-white bg-blue-600 rounded shadow-md transition-all hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={selectedFase}
                            onChange={(e) => setSelectedFase(e.target.value)}
                        >
                            <option value="all" className="bg-white text-gray-900">Todas las Fases</option>
                            {availableFilters.dynamicFases.map(fase => (
                                <option key={fase} value={fase} className="bg-white text-gray-900">
                                    {fase}
                                </option>
                            ))}
                        </select>

                        {/* 2. Etapa */}
                        <select
                            className="input h-10 py-2 px-3 text-sm border-gray-300 w-full rounded shadow-sm"
                            value={selectedEtapa}
                            onChange={(e) => setSelectedEtapa(e.target.value)}
                        >
                            <option value="all">Todas las Etapas</option>
                            {availableFilters.uniqueEtapas.map((e: any) => <option key={String(e.value)} value={String(e.value)}>{String(e.label)}</option>)}
                        </select>

                        {/* 4. Eje */}
                        <select
                            className="input h-10 py-2 px-3 text-sm border-gray-300 w-full rounded shadow-sm"
                            value={selectedEje}
                            onChange={(e) => setSelectedEje(e.target.value)}
                        >
                            <option value="all">Todos los Ejes</option>
                            {availableFilters.dynamicEjes.map((e: any) => <option key={e.value} value={e.value}>{e.label}</option>)}
                        </select>

                        {/* 5. Línea */}
                        <select
                            className="input h-10 py-2 px-3 text-sm border-gray-300 w-full rounded shadow-sm"
                            value={selectedLinea}
                            onChange={(e) => setSelectedLinea(e.target.value)}
                        >
                            <option value="all">Todas las Líneas</option>
                            {availableFilters.dynamicLineas.map((l: any) => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>

                        {/* 6. Modalidad */}
                        <select
                            className="input h-10 py-2 px-3 text-sm border-gray-300 w-full rounded shadow-sm"
                            value={selectedModalidad}
                            onChange={(e) => setSelectedModalidad(e.target.value)}
                        >
                            <option value="all">Todas las Modalidades</option>
                            {availableFilters.dynamicModalidades.map((m: any) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>

                        {/* 7. Especialista (Global) */}
                        <select
                            className="input h-10 py-2 px-3 text-sm border-blue-200 w-full rounded shadow-sm bg-blue-50/30 font-semibold text-blue-800"
                            value={selectedEspecialista}
                            onChange={(e) => setSelectedEspecialista(e.target.value)}
                        >
                            <option value="all">Todos los especialistas</option>
                            {especialistas.map((e: any) => (
                                <option key={String(e.value)} value={String(e.value)}>
                                    {String(e.label)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Presupuesto"
                    value={`S/ ${metrics.totalFondo.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    icon={DollarSign}
                />
                <KPICard
                    title={`Proyectos ${typeof selectedYear === 'object' ? (selectedYear as any).label : (selectedYear || 'Total')}`}
                    value={
                        <div className="flex flex-col">
                            <span>{metrics.totalProjects}</span>
                            <span className="text-sm font-medium text-gray-400 leading-tight">
                                (prom. S/ {metrics.promProj.toLocaleString('es-PE', { maximumFractionDigits: 0 })})
                            </span>
                        </div>
                    }
                    icon={FileText}
                />
                <KPICard
                    title="Beneficiarios"
                    value={
                        <div className="flex flex-col">
                            <span>{metrics.totalBeneficiaries.toLocaleString('es-PE')}</span>
                            <span className="text-sm font-medium text-gray-400 leading-tight">
                                (prom. S/ {metrics.promBen.toLocaleString('es-PE', { maximumFractionDigits: 0 })})
                            </span>
                        </div>
                    }
                    icon={Users}
                />
                <KPICard
                    title="Avance"
                    value={
                        <div className="flex flex-col">
                            <span>S/ {(metrics.totalContra).toLocaleString('es-PE', { maximumFractionDigits: 0 })}</span>
                            <span className="text-sm font-medium text-gray-400">
                                ({metrics.percAvance.toFixed(1)} %)
                            </span>
                        </div>
                    }
                    icon={TrendingUp}
                />
            </div>

            {/* Charts Section */}

            {/* Timeline Chart (Principal) */}
            <div className="w-full" id="timeline-chart-section">
                <TimelineChart 
                    data={filteredTimelineData} 
                    options={{
                        lineas: lines,
                        ejes: ejesList,
                        regiones: regiones,
                        etapas: etapasList,
                        modalidades: modalidades,
                        instituciones: instituciones,
                        grupos: grupos,
                        especialistas: especialistas
                    }}
                />
            </div>

            {/* Bottom Row: Bar Chart (100% width) */}
            <div className="w-full">
                <div className="w-full">
                    <FundingChart
                        data={fundingByRegion}
                        rotateX={-45}
                        formatY="millions"
                        onBarClick={handleFundingBarClick}
                    />
                </div>

                {/* Tabla de Detalle por Región */}
                {selectedRegion && (
                    <div className="mt-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-50">
                            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-tight">
                                {selectedRegion}
                            </h4>
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 italic">
                                    Proyectos: {filteredData.filter(d => d.region === selectedRegion).length}
                                </span>
                                <button
                                    onClick={() => setSelectedRegion(null)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Cerrar detalle"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                                        <th className="py-0.5 px-3 text-[10px] uppercase tracking-wider font-extrabold text-gray-700 w-[100px]">Código</th>
                                        <th className="py-0.5 px-3 text-[10px] uppercase tracking-wider font-extrabold text-gray-700 min-w-[200px]">Institución Ejecutora</th>
                                        <th className="py-0.5 px-3 text-[10px] uppercase tracking-wider font-extrabold text-gray-700 w-[110px] text-center">Etapa</th>
                                        <th className="py-0.5 px-3 text-[10px] uppercase tracking-wider font-extrabold text-gray-700 w-[110px] text-right">Presupuesto</th>
                                        <th className="py-0.5 px-3 text-[10px] uppercase tracking-wider font-extrabold text-gray-700 w-[110px] text-right">Avance</th>
                                        <th className="py-0.5 px-3 text-[10px] uppercase tracking-wider font-extrabold text-gray-700 w-[50px] text-right">%</th>
                                        <th className="py-0.5 px-3 text-[10px] uppercase tracking-wider font-extrabold text-gray-700 w-[70px] text-right">% Ejec.</th>
                                        <th className="py-0.5 px-3 text-[10px] uppercase tracking-wider font-extrabold text-gray-700 w-[100px] text-center">Inicio</th>
                                        <th className="py-0.5 px-3 text-[10px] uppercase tracking-wider font-extrabold text-gray-700 w-[100px] text-center">Fin</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData
                                        .filter(d => d.region === selectedRegion)
                                        .sort((a, b) => a.id - b.id)
                                        .map((proj, idx) => {
                                            const presupuestado = Number(proj.monto_fondoempleo) || 0;
                                            const avance = Number(proj.avance) || 0;
                                            const porcentaje = presupuestado > 0 ? (avance / presupuestado) * 100 : 0;

                                            return (
                                                <tr key={proj.id} className={clsx(
                                                    "border-b border-gray-50 text-[11px] hover:bg-blue-50/30 transition-colors",
                                                    idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                                                )}>
                                                    <td className="py-0.5 px-3 font-medium text-gray-700">
                                                        {proj.codigo || 'Sin código'}
                                                    </td>
                                                    <td className="py-0.5 px-3">
                                                        <div className="truncate max-w-[300px] text-gray-800" title={proj.institucion}>
                                                            {proj.institucion}
                                                        </div>
                                                    </td>
                                                    <td className="py-0.5 px-3 text-center">
                                                        <span className="px-1 py-0 bg-blue-50 text-blue-700 rounded-full text-[8px] font-bold border border-blue-100 whitespace-nowrap">
                                                            {proj.etapa_id || proj.etapa || proj.estado || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="py-0.5 px-3 text-right font-bold text-blue-700">
                                                        S/ {presupuestado.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                    </td>
                                                    <td className="py-0.5 px-3 text-right font-bold text-emerald-700">
                                                        S/ {avance.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                    </td>
                                                    <td className="py-0.5 px-3 text-right font-bold text-gray-700">
                                                        {porcentaje.toFixed(1)}%
                                                    </td>
                                                    <td className="py-0.5 px-3 text-right font-bold text-blue-600">
                                                        {proj.avance_tecnico ?? 0}%
                                                    </td>
                                                    <td className="py-0.5 px-3 text-center text-gray-600">
                                                        {proj.fecha_inicio ? new Date(proj.fecha_inicio).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : '-'}
                                                    </td>
                                                    <td className="py-0.5 px-3 text-center text-gray-600">
                                                        {proj.fecha_fin ? new Date(proj.fecha_fin).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full mt-2">
                <PeruMapChart data={bubbleMapData} onProyectoClick={handleProyectoClick} />
            </div>

            {/* Gestora Chart */}
            {gestoraData.length > 0 && (
                <div className="w-full">
                    <GestoraChart data={gestoraData} />
                </div>
            )}

            {/* Proyecto Modal */}
            <ProyectoModal
                isOpen={isProjectModalOpen}
                onClose={() => {
                    setIsProjectModalOpen(false);
                    setSelectedModalProyecto(null);
                }}
                onSave={async () => {}} // Read-only
                proyecto={selectedModalProyecto}
                isReadOnly={true}
                options={{
                    lineas: lines,
                    ejes: ejesList,
                    regiones: regiones,
                    etapas: etapasList,
                    modalidades: modalidades,
                    instituciones: instituciones,
                    grupos: grupos,
                    especialistas: especialistas
                }}
            />

            {/* Premium Loading Spinner with blur backdrop */}
            {isLoadingProjectModal && (
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

// Helper to fix icon prop in KPICard usage above if needed.
// Actually KPICard accepts LucideIcon type, and we import { Users } from 'lucide-react', so passing `icon={Users}` is valid.
