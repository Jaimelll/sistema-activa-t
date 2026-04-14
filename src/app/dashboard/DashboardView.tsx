"use client";
// Force Update: 2026-04-14 MAP-BUBBLE-v2

import { useState, useMemo, useEffect } from 'react';
import { KPICard } from '@/components/dashboard/KPICard';
import { getDashboardStats, getTimelineData, getRegionData, getInstitucionData } from './actions';
import { FundingChart } from '@/components/dashboard/charts/FundingChart';
import { StatusChart } from '@/components/dashboard/charts/StatusChart';
import { EjeChart } from '@/components/dashboard/charts/EjeChart';
import { DollarSign, FileText, CheckCircle, TrendingUp, Filter, Users, LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { clsx } from 'clsx';
import { GestoraChart } from '@/components/dashboard/charts/GestoraChart';
import { TimelineChart } from '@/components/dashboard/charts/TimelineChart';

// ─── PERU MAP BUBBLE ─────────────────────────────────────────────────────────

const PERU_EXCLUDED = ['por definir','multiregional','vraem','cusco y puno','multirregional'];
function peruIsExcluded(name: string) {
  const l = name.toLowerCase().trim();
  return PERU_EXCLUDED.some(e => l.includes(e));
}

const PERU_COORDS: Record<string,[number,number]> = {
  tumbes:[42,42],piura:[52,75],lambayeque:[62,110],'la libertad':[72,138],
  ancash:[82,172],lima:[90,220],ica:[95,265],cajamarca:[115,108],
  amazonas:[140,82],'san mart\u00edn':[170,108],'san martin':[170,108],
  'hu\u00e1nuco':[145,168],huanuco:[145,168],pasco:[132,198],
  'jun\u00edn':[128,225],junin:[128,225],huancavelica:[118,255],
  ayacucho:[130,290],'apur\u00edmac':[140,310],apurimac:[140,310],
  arequipa:[138,348],moquegua:[160,390],tacna:[168,425],
  cusco:[185,315],puno:[205,358],loreto:[210,96],
  ucayali:[218,200],'madre de dios':[250,308],
};
function peruGetCoords(name: string): [number,number]|null {
  const l = name.toLowerCase().trim();
  if (PERU_COORDS[l]) return PERU_COORDS[l];
  for (const k of Object.keys(PERU_COORDS)) {
    if (l.includes(k)||k.includes(l)) return PERU_COORDS[k];
  }
  return null;
}

const PERU_SVG_PATH=`M52 30 L42 40 L38 52 L40 62 L48 70 L50 82 L56 90
  L58 102 L62 108 L64 115 L68 118 L72 128 L76 138 L78 148 L82 155
  L84 162 L90 168 L90 178 L92 188 L94 200 L92 210 L90 220 L92 230
  L94 240 L94 250 L96 260 L96 270 L100 280 L106 290 L110 305 L114 318
  L120 330 L125 342 L130 352 L135 362 L138 372 L142 382 L150 395
  L158 408 L162 418 L168 428 L172 438 L178 445 L186 448 L195 446
  L205 443 L215 440 L222 434 L225 425 L228 415 L232 405 L238 392
  L245 378 L252 365 L260 350 L268 335 L272 320 L275 305 L274 290
  L272 278 L268 265 L268 252 L270 240 L272 226 L274 212 L276 198
  L275 185 L274 172 L272 160 L270 148 L268 138 L264 126 L260 115
  L256 105 L252 95 L248 82 L244 70 L242 58 L245 46 L250 36 L248 28
  L238 22 L225 18 L210 16 L195 14 L180 14 L165 16 L150 18 L138 22
  L125 26 L112 28 L100 28 L88 28 L75 28 L64 28 L52 30 Z`;

function peruBubbleR(count:number,max:number){if(!max)return 0;return 6+((count/max)*(32-6));}
function peruBubbleColor(count:number,max:number){const r=count/max;if(r>0.75)return{fill:'#1d4ed8',stroke:'#93c5fd'};if(r>0.5)return{fill:'#2563eb',stroke:'#bfdbfe'};if(r>0.25)return{fill:'#3b82f6',stroke:'#dbeafe'};return{fill:'#60a5fa',stroke:'#eff6ff'};}

interface PeruBubble { regionId:any; regionName:string; count:number; proyectos:{id:number;codigo:string;nombre:string}[]; }

function InlinePeruMap({data}:{data:PeruBubble[]}){
  const [tip,setTip]=useState<{name:string;count:number;proyectos:{id:number;codigo:string;nombre:string}[];x:number;y:number}|null>(null);
  const bubbles=data
    .filter(d=>!peruIsExcluded(d.regionName))
    .map(d=>({...d,coords:peruGetCoords(d.regionName)}))
    .filter(d=>d.coords!==null) as Array<PeruBubble&{coords:[number,number]}>;
  const maxC=Math.max(...bubbles.map(b=>b.count),1);
  const totalFiltered=data.reduce((a,b)=>a+b.count,0);
  const totalMapped=bubbles.reduce((a,b)=>a+b.count,0);
  const unmapped=totalFiltered-totalMapped;
  return(
    <div className="card w-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Distribución Geográfica de Proyectos</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Mapa proporcional por departamento — tamaño de burbuja = N° proyectos</p>
        </div>
        <div className="flex items-center gap-3">
          {unmapped>0&&<span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full font-semibold">{unmapped} proy. sin ubicación estándar</span>}
          <span className="text-[10px] text-gray-400 italic">Hover para ver detalle</span>
        </div>
      </div>
      <div className="flex gap-6 items-start">
        <div className="flex-1 flex justify-center">
          <svg viewBox="0 0 310 480" className="w-full max-w-xs h-auto" style={{overflow:'visible'}}>
            <defs>
              <filter id="pg"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <filter id="ps"><feDropShadow dx="1" dy="2" stdDeviation="3" floodOpacity="0.12"/></filter>
            </defs>
            <path d={PERU_SVG_PATH} fill="#f0f4ff" stroke="#c7d2fe" strokeWidth="1.5" strokeLinejoin="round" filter="url(#ps)"/>
            {[...bubbles].sort((a,b)=>a.count-b.count).map(b=>{
              const r=peruBubbleR(b.count,maxC);
              const c=peruBubbleColor(b.count,maxC);
              return(
                <g key={b.regionId} style={{cursor:'pointer'}}
                  onMouseMove={e=>setTip({name:b.regionName,count:b.count,proyectos:b.proyectos,x:e.clientX,y:e.clientY})}
                  onMouseLeave={()=>setTip(null)}>
                  <circle cx={b.coords[0]} cy={b.coords[1]} r={r+4} fill={c.fill} opacity={0.15}/>
                  <circle cx={b.coords[0]} cy={b.coords[1]} r={r} fill={c.fill} stroke={c.stroke} strokeWidth={1.5} opacity={0.88} filter="url(#pg)"/>
                  {r>=12&&<text x={b.coords[0]} y={b.coords[1]+4} textAnchor="middle" fontSize={r>=18?10:8} fontWeight="800" fill="white" style={{pointerEvents:'none'}}>{b.count}</text>}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="w-52 shrink-0 space-y-3 pt-2">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Escala</p>
            <div className="flex items-end gap-3">
              {[0.25,0.5,1].map((ratio,i)=>{
                const r=peruBubbleR(Math.round(maxC*ratio),maxC);
                return(<div key={i} className="flex flex-col items-center gap-1">
                  <div style={{width:r*2,height:r*2,borderRadius:'50%',background:'#2563eb',opacity:0.7}}/>
                  <span className="text-[9px] text-gray-400">{['Bajo','Medio','Alto'][i]}</span>
                </div>);
              })}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Top Regiones</p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {[...bubbles].sort((a,b)=>b.count-a.count).map((b,i)=>(
                <div key={b.regionId} className="group cursor-default"
                  onMouseMove={e=>setTip({name:b.regionName,count:b.count,proyectos:b.proyectos,x:e.clientX,y:e.clientY})}
                  onMouseLeave={()=>setTip(null)}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-semibold text-gray-700">{i+1}. {b.regionName}</span>
                    <span className="text-[10px] font-extrabold text-blue-700">{b.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1">
                    <div className="h-1 bg-blue-500 rounded-full" style={{width:`${(b.count/maxC)*100}%`}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {tip&&(
        <div className="fixed z-50 pointer-events-none" style={{left:tip.x+14,top:tip.y-10}}>
          <div className="bg-gray-900 text-white rounded-xl shadow-2xl border border-white/10 p-3 w-64 text-xs">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
              <span className="font-bold text-sm text-blue-300">{tip.name}</span>
              <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold">{tip.count} proy.</span>
            </div>
            <div className="space-y-1.5">
              {[...tip.proyectos].sort((a,b)=>b.id-a.id).slice(0,3).map(p=>(
                <div key={p.id} className="flex gap-2 items-start">
                  <span className="shrink-0 text-[9px] font-bold text-gray-400">#{p.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-blue-200 truncate">{p.codigo||'—'}</p>
                    <p className="text-[9px] text-gray-400 line-clamp-2">{p.nombre}</p>
                  </div>
                </div>
              ))}
              {tip.count>3&&<p className="text-[9px] text-gray-500 italic pt-1 border-t border-white/10">+ {tip.count-3} más</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── FIN PERU MAP BUBBLE ─────────────────────────────────────────────────────

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
    if (initialData && initialData.length > 0) {
        console.log('PRIMER REGISTRO:', initialData[0]);
    }
    console.log('Verificación de Despliegue - Timestamp:', new Date().toISOString());

    // State for filters
    const [selectedYear, setSelectedYear] = useState<any>(''); // Default empty for 'All'
    const [selectedLinea, setSelectedLinea] = useState<any>('all');
    const [selectedEje, setSelectedEje] = useState<any>('all');
    const [selectedEtapa, setSelectedEtapa] = useState<any>('all');
    const [selectedModalidad, setSelectedModalidad] = useState<any>('all');
    const [selectedFase, setSelectedFase] = useState<any>("Ejecución del Proyecto");
    const [selectedRegion, setSelectedRegion] = useState<any>(null);
    const [selectedEspecialista, setSelectedEspecialista] = useState<any>('all');
    const [dashboardData, setDashboardData] = useState(initialData);
    const [timelineDataState, setTimelineDataState] = useState(timelineData);
    const [isInitialMount, setIsInitialMount] = useState(true);

    const handleFundingBarClick = (region: string) => {
        setSelectedRegion(region === selectedRegion ? null : region);
    };

    // Use passed years directly - NO LOGIC HERE
    // years prop comes from server as sorted number array or objects

    // const lineas = useMemo(() => Array.from(new Set(initialData.map(d => d.linea))).sort(), [initialData]); // DEPRECATED: Using props
    // const ejes = useMemo(() => Array.from(new Set(initialData.map(d => d.eje))).sort(), [initialData]); // DEPRECATED: Using props
    // stages passed from props now

    // Main Filter Logic (Applied to Data)
    const filteredData = useMemo(() => {
        return dashboardData.filter(item => {
            const matchYear = !selectedYear || selectedYear === 'all' || String(item.año) === String(selectedYear);

            const matchLinea = selectedLinea === 'all' || String(item.lineaId) === String(selectedLinea);
            const matchEje = selectedEje === 'all' || String(item.ejeId || item.eje_id || item.eje) === String(selectedEje);
            const matchEtapa = selectedEtapa === 'all' || String(item.etapaId) === String(selectedEtapa);

            const matchModalidad = selectedModalidad === 'all' || String(item.modalidadId) === String(selectedModalidad);
            const matchFase = !selectedFase || selectedFase === 'all' || item.fase === selectedFase;

            return matchYear && matchLinea && matchEje && matchEtapa && matchFase && matchModalidad;
        });
    }, [dashboardData, selectedYear, selectedLinea, selectedEje, selectedEtapa, selectedFase, selectedModalidad]);

    // REACTIVE GLOBAL FILTER EFFECT
    useEffect(() => {
        if (isInitialMount) {
            setIsInitialMount(false);
            return;
        }

        async function refreshDashboardData() {
            const id = selectedEspecialista === 'all' ? undefined : Number(selectedEspecialista);
            
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

    // Filter Logic for Options (Dynamic Lists)
    const availableFilters = useMemo(() => {
        const dataForOptions = dashboardData.filter(item => {
            const matchYear = !selectedYear || selectedYear === 'all' || String(item.año) === String(selectedYear);

            const matchFase = !selectedFase || selectedFase === 'all' || item.fase === selectedFase;

            return matchYear && matchFase;
        });

        const uniqueLineas = Array.from(new Set(dataForOptions.map(d => String(d.lineaId))));
        const uniqueEjes = Array.from(new Set(dataForOptions.map(d => String(d.ejeId || d.eje_id || d.eje))));
        // Store both value and label to avoid rendering objects as children
        const uniqueEtapasSet = new Set(dataForOptions.filter(d => d.etapaId).map(d => JSON.stringify({ value: String(d.etapaId), label: String(d.etapa) })));
        const uniqueEtapas = Array.from(uniqueEtapasSet)
            .map(e => JSON.parse(e))
            .sort((a: any, b: any) => a.label.localeCompare(b.label));

        const dynamicLineas = lines
            .filter((l: any) => uniqueLineas.includes(String(l.value)))
            .sort((a: any, b: any) => a.label.localeCompare(b.label));

        const dynamicEjes = ejesList
            .filter((e: any) => uniqueEjes.includes(String(e.value)))
            .sort((a: any, b: any) => a.label.localeCompare(b.label));

        return { dynamicLineas, dynamicEjes, uniqueEtapas };
    }, [dashboardData, selectedYear, selectedFase, lines, ejesList, selectedModalidad]);

    // Debug logging requested by user - REMOVED


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
        const map = new Map<any, { regionId: any; regionName: string; count: number; proyectos: { id: number; codigo: string; nombre: string }[] }>();
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
                            {fases.map(fase => (
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
                            {modalidades.map((m: any) => <option key={m.value} value={m.value}>{m.label}</option>)}
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

                    {/* Reset Button - Hidden but kept structure if needed later, or integrated into logic */}
                    {/* <div className="hidden lg:flex items-center px-2 text-gray-400">
                        <Filter className="w-5 h-5" />
                    </div> */}
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
            <div className="w-full">
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

            {/* === MAPA INTERACTIVO DE BURBUJAS POR DEPARTAMENTO === */}
            <div className="w-full mt-2">
                <InlinePeruMap data={bubbleMapData} />
            </div>

            {/* Gestora Chart */}
            {gestoraData.length > 0 && (
                <div className="w-full">
                    <GestoraChart data={gestoraData} />
                </div>
            )}

        </div>
    );
}

// Helper to fix icon prop in KPICard usage above if needed.
// Actually KPICard accepts LucideIcon type, and we import { Users } from 'lucide-react', so passing `icon={Users}` is valid.
