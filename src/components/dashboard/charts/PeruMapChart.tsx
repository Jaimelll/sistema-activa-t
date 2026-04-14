"use client";

import { useState, useCallback, useRef, useMemo } from 'react';
import { PERU_MAP_DATA } from './peruMapData';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProyectoBurbuja {
  id: number;
  codigo: string;
  nombre: string;
}

interface RegionBubble {
  regionId: any;
  regionName: string;
  count: number;
  proyectos: ProyectoBurbuja[];
}

interface PeruMapChartProps {
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
  // Radio para el viewBox 600x850
  const minR = 8;
  const maxR = 40;
  // Percepción de área proporcional (raíz cuadrada)
  return minR + (Math.sqrt(count / maxCount) * (maxR - minR));
}

// ─── Tooltip Component ───────────────────────────────────────────────────────

interface TooltipData {
  regionName: string;
  count: number;
  proyectos: ProyectoBurbuja[];
  x: number;
  y: number;
}

function MapTooltip({ data }: { data: TooltipData }) {
  const recent = [...data.proyectos].sort((a, b) => b.id - a.id);

  return (
    <div
      className="fixed z-50 pointer-events-none transition-transform duration-75"
      style={{ left: data.x + 14, top: data.y - 10 }}
    >
      <div className="bg-gray-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-white/20 p-3 w-64 text-xs ring-1 ring-black/5">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
          <span className="font-bold text-sm text-blue-300">{data.regionName}</span>
          <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-sm">
            {data.count} proy.
          </span>
        </div>

        {/* proyectos list */}
        <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
          {recent.map((p) => (
            <div key={p.id} className="flex gap-2 items-start border-l-2 border-blue-500/30 pl-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-blue-100 truncate">
                  {p.codigo || `#${p.id}`}
                </p>
                <p className="text-[9px] text-gray-400 line-clamp-2 leading-snug">
                  {p.nombre}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PeruMapChart({ data }: PeruMapChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Mapear datos recibidos a la cartografía real
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
      setTooltip({
        regionName: region.regionName,
        count: region.count,
        proyectos: region.proyectos,
        x: e.clientX,
        y: e.clientY,
      });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    setHoveredRegion(null);
  }, []);

  // Color de burbuja basado en importancia
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
    <div className="card w-full shadow-lg border border-gray-100 bg-white overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
        <div>
          <h3 className="text-lg font-bold text-gray-800 tracking-tight">
            Distribución de Proyectos
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {unmapped > 0 && (
            <div className="group relative">
              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-help">
                {unmapped} proyectos sin ubicación específica
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col md:flex-row gap-8 items-start relative">
        {/* SVG Map Container */}
        <div className="flex-1 flex justify-center items-center bg-blue-50/20 rounded-3xl p-4 border border-blue-100/50 w-full min-h-[600px]">
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

            {/* Department Paths */}
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

            {/* Bubbles Layer */}
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
                      {/* Outer pulse ring */}
                      <circle
                        cx={b.coords[0]}
                        cy={b.coords[1]}
                        r={r + 8}
                        fill={colors.fill}
                        opacity={isHovered ? 0.3 : 0.1}
                        className="animate-pulse duration-2000"
                      />
                      {/* Main bubble */}
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
                      {/* Count label */}
                      {r >= 14 && (
                        <text
                          x={b.coords[0]}
                          y={b.coords[1] + 5}
                          textAnchor="middle"
                          fontSize={r >= 20 ? 14 : 11}
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
                          {b.count}
                        </text>
                      )}
                    </g>
                  );
                })}
            </g>
          </svg>
        </div>

        {/* Legend + Region List Sidebar */}
        <div className="w-full md:w-64 shrink-0 flex flex-col bg-gray-50/50 rounded-2xl p-5 border border-gray-100 h-[600px]">
          <div className="mb-8">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-blue-500 rounded-full"></span>
              Escala de Proyectos
            </p>
            <div className="flex items-end justify-between px-2">
              {[0.2, 0.6, 1].map((ratio, i) => {
                const count = Math.round(maxCount * ratio);
                const r = bubbleRadius(count, maxCount);
                const labels = ['Baja', 'Media', 'Alta'];
                return (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div
                      style={{
                        width: r * 1.4,
                        height: r * 1.4,
                        borderRadius: '50%',
                        background: '#3b82f6',
                        opacity: 0.8 - (i * 0.1),
                      }}
                      className="shadow-sm border border-blue-200"
                    />
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-gray-600">{count}</p>
                      <p className="text-[8px] text-gray-400 uppercase">{labels[i]}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-blue-500 rounded-full"></span>
              Ranking de Regiones
            </p>
            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {[...bubbles]
                .sort((a, b) => b.count - a.count)
                .map((b, i) => {
                  const pct = maxCount > 0 ? (b.count / maxCount) * 100 : 0;
                  const isHovered = hoveredRegion === b.geoId;
                  
                  return (
                    <div
                      key={`rank-${b.regionId}`}
                      className={`group transition-all duration-300 p-2.5 rounded-xl border ${isHovered ? 'bg-white border-blue-200 shadow-md translate-x-1' : 'bg-transparent border-transparent'}`}
                      onMouseMove={(e) => handleMouseMove(e, b)}
                      onMouseEnter={() => setHoveredRegion(b.geoId)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-[10px] font-bold w-5 h-5 rounded-md flex items-center justify-center transition-colors ${i < 3 ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                            {i + 1}
                          </span>
                          <span className={`text-[11px] font-bold transition-colors ${isHovered ? 'text-blue-700' : 'text-gray-700'}`}>
                            {b.regionName}
                          </span>
                        </div>
                        <span className="text-[11px] font-black text-gray-900">
                          {b.count}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200/40 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${i < 3 ? 'bg-blue-600' : 'bg-blue-400'}`}
                          style={{ width: isHovered ? '100%' : `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && <MapTooltip data={tooltip} />}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
