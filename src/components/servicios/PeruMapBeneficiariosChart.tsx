"use client";

import { useState, useCallback, useRef, useMemo } from 'react';
import { PERU_MAP_DATA } from '../dashboard/charts/peruMapData';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProyectoBurbuja {
  id: number;
  codigo: string;
  nombre: string;
  beneficiarios: number;
  institucion: string;
}

interface RegionBubble {
  regionId: any;
  regionName: string;
  count: number; // TOTAL DE BENEFICIARIOS
  proyectos: ProyectoBurbuja[];
}

interface PeruMapBeneficiariosChartProps {
  data: RegionBubble[];
}

// ─── Regiones excluidas del mapa ─────────────────────────────────────────────

const EXCLUDED_REGIONS_LOWER = [
  'por definir',
  'multiregional',
  'vraem',
  'cusco y puno',
  'multirregional',
];

function isExcluded(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return EXCLUDED_REGIONS_LOWER.some((excl) => lower.includes(excl));
}

// ─── Escala de radio para burbujas ───────────────────────────────────────────

function bubbleRadius(count: number, maxCount: number): number {
  if (maxCount === 0) return 0;
  const minR = 8;
  const maxR = 40;
  return minR + (Math.sqrt(count / maxCount) * (maxR - minR));
}

// ─── Tooltip Component ───────────────────────────────────────────────────────

interface TooltipData {
  regionName: string;
  count: number;
  participation: string;
  proyectos: ProyectoBurbuja[];
  x: number;
  y: number;
  isRightSide: boolean;
  isBottomSide: boolean;
  isMobile: boolean;
}

function MapTooltip({ data }: { data: TooltipData }) {
  // Agrupación por Institución
  const institutions = useMemo(() => {
    const map = new Map<string, number>();
    data.proyectos.forEach((p) => {
      const name = p.institucion || 'Sin Institución';
      map.set(name, (map.get(name) || 0) + p.beneficiarios);
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [data.proyectos]);

  const topInstitutions = institutions.slice(0, 10);
  const remainingCount = institutions.length - 10;

  const isMobile = data.isMobile;
  const transformX = isMobile ? '-50%' : (data.isRightSide ? 'calc(-100% - 14px)' : '14px');
  const transformY = isMobile ? '-50%' : (data.isBottomSide ? 'calc(-100% - 14px)' : '-10px');

  return (
    <div
      className={`fixed z-[100] transition-all duration-200 ease-out ${isMobile ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{ 
        left: data.x, 
        top: data.y,
        transform: `translate(${transformX}, ${transformY})`
      }}
    >
      <div className="bg-gray-900/95 backdrop-blur-md text-white rounded-[1.5rem] sm:rounded-xl shadow-2xl border border-white/20 p-3 sm:p-5 w-screen max-w-[92vw] sm:w-[450px] text-xs ring-1 ring-black/5 flex flex-col max-h-[75vh] sm:max-h-none overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 sm:mb-4 pb-2 sm:pb-4 border-b border-white/10 shrink-0">
          <div className="flex flex-col">
            <span className="font-bold text-sm sm:text-lg text-blue-300">{data.regionName}</span>
            <span className="text-[8px] sm:text-[10px] text-gray-400 font-black uppercase tracking-widest">Participación: {data.participation}</span>
          </div>
          <div className="text-right">
            <span className="bg-blue-600 text-white px-2 sm:px-4 py-0.5 sm:py-1.5 rounded-full text-[10px] sm:text-[13px] font-black shadow-lg shadow-blue-500/20 whitespace-nowrap">
              {data.count.toLocaleString('es-PE')} <span className="text-[8px] sm:text-[10px] opacity-80">BENEFS.</span>
            </span>
          </div>
        </div>

        {/* Institutions List */}
        <div className="space-y-1.5 sm:space-y-2 pr-1 overflow-y-auto custom-scrollbar flex-1">
          <p className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 sm:mb-2 flex items-center gap-2">
            <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-blue-500 rounded-full"></span>
            Detalle por Institución
          </p>
          {topInstitutions.map((inst, idx) => (
            <div key={idx} className="flex justify-between items-center gap-3 sm:gap-4 py-1 sm:py-2 px-2 sm:px-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-200 truncate flex-1 uppercase">
                {inst.name}
              </span>
              <span className="text-[10px] sm:text-[11px] font-black text-blue-300 tabular-nums whitespace-nowrap">
                {inst.count.toLocaleString('es-PE')} <span className="text-[8px] font-medium text-gray-400 ml-0.5 sm:ml-1">BENEFS.</span>
              </span>
            </div>
          ))}
          
          {remainingCount > 0 && (
            <div className="pt-2 text-center border-t border-white/5 mt-2 shrink-0">
              <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold italic">
                Y {remainingCount} instituciones más...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PeruMapBeneficiariosChart({ data }: PeruMapBeneficiariosChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const totalBeneficiariosGlobal = useMemo(() => data.reduce((acc, b) => acc + b.count, 0), [data]);

  const bubbles = useMemo(() => {
    return data
      .filter((d) => !isExcluded(d.regionName))
      .map((d) => {
        const nameNorm = d.regionName.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .trim();
        
        const geoData = PERU_MAP_DATA.find(r => 
          r.id === nameNorm || 
          nameNorm.includes(r.id) || 
          r.id.includes(nameNorm)
        );
        
        return geoData ? { ...d, coords: geoData.centroid, geoId: geoData.id } : null;
      })
      .filter((d): d is (RegionBubble & { coords: [number, number], geoId: string }) => d !== null);
  }, [data]);

  const maxCount = useMemo(() => Math.max(...bubbles.map((b) => b.count), 1), [bubbles]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, region: RegionBubble) => {
      const isMobile = window.innerWidth < 768;
      const isRightSide = e.clientX > window.innerWidth / 2;
      const isBottomSide = e.clientY > window.innerHeight - 350;

      const participation = totalBeneficiariosGlobal > 0 
        ? ((region.count / totalBeneficiariosGlobal) * 100).toFixed(1) + '%' 
        : '0%';

      setTooltip({
        regionName: region.regionName,
        count: region.count,
        participation,
        proyectos: region.proyectos,
        x: isMobile ? window.innerWidth / 2 : e.clientX,
        y: isMobile ? window.innerHeight / 2 : e.clientY,
        isRightSide: isMobile ? false : isRightSide,
        isBottomSide: isMobile ? false : isBottomSide,
        isMobile
      });
    },
    [totalBeneficiariosGlobal]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    setHoveredRegion(null);
  }, []);

  function bubbleColor(count: number, max: number) {
    const ratio = count / max;
    if (ratio > 0.75) return { fill: '#1d4ed8', stroke: '#93c5fd' }; 
    if (ratio > 0.5)  return { fill: '#2563eb', stroke: '#bfdbfe' }; 
    if (ratio > 0.25) return { fill: '#3b82f6', stroke: '#dbeafe' }; 
    return { fill: '#60a5fa', stroke: '#eff6ff' };                    
  }

  const totalMapped   = bubbles.reduce((acc, b) => acc + b.count, 0);
  const totalFiltered = data.reduce((acc, b) => acc + b.count, 0);
  const unmapped      = totalFiltered - totalMapped;

  return (
    <div className="card w-full shadow-lg border border-gray-100 bg-white overflow-hidden rounded-[2.5rem]">
      {/* Header */}
      <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">
            Distribución de Beneficiarios por Región
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {unmapped > 0 && (
            <div className="group relative">
              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-help">
                {unmapped.toLocaleString('es-PE')} beneficiarios sin ubicación específica
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-8 flex flex-col md:flex-row gap-8 items-start relative">
        <div className="flex-1 flex justify-center items-center bg-blue-50/20 rounded-[2rem] p-6 border border-blue-100/50 w-full min-h-[600px]">
          <svg
            ref={svgRef}
            viewBox="-10 -10 620 870"
            className="w-full max-w-[480px] h-auto drop-shadow-xl"
            style={{ overflow: 'visible', transform: 'scaleY(-1)' }}
          >
            <defs>
              <filter id="bubble-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <g id="peru-departments" className="drop-shadow-[0_0_8px_rgba(0,0,0,0.15)]">
              {PERU_MAP_DATA.map((region, index) => {
                const isHovered = hoveredRegion === region.id;
                return (
                  <path
                    key={`${region.id}-${index}`}
                    d={region.path}
                    fill={isHovered ? "#e0f2fe" : "#f1f5f9"}
                    stroke={isHovered ? "#0ea5e9" : "#475569"}
                    strokeWidth={isHovered ? "2" : "1.5"}
                    className="transition-all duration-300 ease-out cursor-default"
                    onMouseEnter={() => setHoveredRegion(region.id)}
                    onMouseLeave={handleMouseLeave}
                  />
                );
              })}
            </g>

            <g id="bubbles">
              {[...bubbles]
                .sort((a, b) => a.count - b.count)
                .map((b) => {
                  const r = bubbleRadius(b.count, maxCount);
                  const colors = bubbleColor(b.count, maxCount);
                  const isHovered = hoveredRegion === b.geoId;
                  
                  return (
                    <g
                      key={`bubble-g-${b.regionId}`}
                      style={{ cursor: 'pointer' }}
                      onMouseMove={(e) => handleMouseMove(e, b)}
                      onMouseEnter={() => setHoveredRegion(b.geoId)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <circle
                        cx={b.coords[0]}
                        cy={b.coords[1]}
                        r={r + 8}
                        fill={colors.fill}
                        opacity={isHovered ? 0.3 : 0.1}
                        className="animate-pulse duration-2000"
                      />
                      <circle
                        cx={b.coords[0]}
                        cy={b.coords[1]}
                        r={r}
                        fill={colors.fill}
                        stroke={colors.stroke}
                        strokeWidth={2.5}
                        opacity={0.92}
                        filter={isHovered ? "url(#bubble-glow)" : ""}
                        className="transition-all duration-300"
                      />
                      {r >= 14 && (
                        <text
                          x={b.coords[0]}
                          y={b.coords[1] + 5}
                          textAnchor="middle"
                          fontSize={r >= 22 ? 14 : 11}
                          fontWeight="900"
                          fill="white"
                          style={{ 
                            pointerEvents: 'none', 
                            userSelect: 'none',
                            transformOrigin: `${b.coords[0]}px ${b.coords[1]}px`,
                            transform: 'scaleY(-1)'
                          }}
                          className="drop-shadow-md"
                        >
                          {b.count > 999 ? `${(b.count / 1000).toFixed(1)}k` : b.count}
                        </text>
                      )}
                    </g>
                  );
                })}
            </g>
          </svg>
        </div>

        <div className="w-full md:w-80 shrink-0 flex flex-col bg-gray-50/50 rounded-3xl p-6 border border-gray-100 h-[600px] shadow-inner">
          <div className="flex-1 flex flex-col min-h-0">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <span className="w-2 h-4 bg-blue-600 rounded-full shadow-lg shadow-blue-200"></span>
              Beneficiarios por Región
            </p>
            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {[...bubbles]
                .sort((a, b) => b.count - a.count)
                .map((b, i) => {
                  const pct = totalBeneficiariosGlobal > 0 ? (b.count / totalBeneficiariosGlobal) * 100 : 0;
                  const isHovered = hoveredRegion === b.geoId;
                  
                  return (
                    <div
                      key={`rank-${b.regionId}`}
                      className={`group transition-all duration-300 p-3.5 rounded-2xl border ${isHovered ? 'bg-white border-blue-200 shadow-xl translate-x-1' : 'bg-white/50 border-gray-100'}`}
                      onMouseMove={(e) => handleMouseMove(e, b)}
                      onMouseEnter={() => setHoveredRegion(b.geoId)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${i < 3 ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                            {i + 1}
                          </span>
                          <span className={`text-sm font-black transition-colors ${isHovered ? 'text-blue-700' : 'text-slate-700'} uppercase tracking-tight`}>
                            {b.regionName}
                          </span>
                        </div>
                        <span className="text-sm font-black text-blue-800 tabular-nums">
                          {b.count.toLocaleString('es-PE')}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200/40 rounded-full h-2 overflow-hidden shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${i < 3 ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]' : 'bg-blue-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-end mt-1.5">
                        <span className="text-[9px] font-black text-gray-400 tracking-widest">{pct.toFixed(1)}% DEL TOTAL</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {tooltip && <MapTooltip data={tooltip} />}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
