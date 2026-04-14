"use client";

import { useState, useCallback, useRef } from 'react';

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

// ─── Coordenadas de centroides por departamento (viewport 380x500) ────────────
// Proyección manual ajustada para el SVG viewBox="0 0 380 500"
// Basado en la silueta geográfica real del Perú.

const DEPT_COORDS: Record<string, [number, number]> = {
  // Norte Costa
  tumbes:         [42,  42],
  piura:          [52,  75],
  lambayeque:     [62, 110],
  'la libertad':  [72, 138],
  ancash:         [82, 172],
  lima:           [90, 220],
  ica:            [95, 265],

  // Norte Sierra / Selva Alta
  cajamarca:      [115, 108],
  amazonas:       [140,  82],
  'san martín':   [170, 108],
  'san martin':   [170, 108],
  huánuco:        [145, 168],
  huanuco:        [145, 168],
  pasco:          [132, 198],
  junín:          [128, 225],
  junin:          [128, 225],
  huancavelica:   [118, 255],
  ayacucho:       [130, 290],
  apurímac:       [140, 310],
  apurimac:       [140, 310],

  // Sur Sierra / Altiplano
  arequipa:       [138, 348],
  moquegua:       [160, 390],
  tacna:          [168, 425],
  cusco:          [185, 315],
  puno:           [205, 358],

  // Selva
  loreto:         [210,  96],
  ucayali:        [218, 200],
  'madre de dios':[250, 308],
};

function getCoords(name: string): [number, number] | null {
  const lower = name.toLowerCase().trim();
  // Direct match
  if (DEPT_COORDS[lower]) return DEPT_COORDS[lower];
  // Partial match
  for (const key of Object.keys(DEPT_COORDS)) {
    if (lower.includes(key) || key.includes(lower)) {
      return DEPT_COORDS[key];
    }
  }
  return null;
}

// ─── SVG Path del contorno del Perú ──────────────────────────────────────────
// Path simplificado del contorno político del Perú, escalado a viewBox 0 0 380 500

const PERU_PATH = `M 52 30
  L 42 40 L 38 52 L 40 62 L 48 70 L 50 82 L 56 90
  L 58 102 L 62 108 L 64 115 L 68 118 L 72 128
  L 76 138 L 78 148 L 82 155 L 84 162 L 90 168
  L 90 178 L 92 188 L 94 200 L 92 210 L 90 220
  L 92 230 L 94 240 L 94 250 L 96 260 L 96 270
  L 100 280 L 106 290 L 110 305 L 114 318
  L 120 330 L 125 342 L 130 352 L 135 362
  L 138 372 L 142 382 L 150 395 L 158 408
  L 162 418 L 168 428 L 172 438 L 178 445
  L 186 448 L 195 446 L 205 443 L 215 440
  L 222 434 L 225 425 L 228 415 L 232 405
  L 238 392 L 245 378 L 252 365 L 260 350
  L 268 335 L 272 320 L 275 305 L 274 290
  L 272 278 L 268 265 L 268 252 L 270 240
  L 272 226 L 274 212 L 276 198 L 275 185
  L 274 172 L 272 160 L 270 148 L 268 138
  L 264 126 L 260 115 L 256 105 L 252 95
  L 248 82 L 244 70 L 242 58 L 245 46
  L 250 36 L 248 28 L 238 22 L 225 18
  L 210 16 L 195 14 L 180 14 L 165 16
  L 150 18 L 138 22 L 125 26 L 112 28
  L 100 28 L 88 28 L 75 28 L 64 28 L 52 30 Z`;

// ─── Escala de radio para burbujas ───────────────────────────────────────────

function bubbleRadius(count: number, maxCount: number): number {
  if (maxCount === 0) return 0;
  const minR = 6;
  const maxR = 32;
  return minR + ((count / maxCount) * (maxR - minR));
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
  const recent = [...data.proyectos]
    .sort((a, b) => b.id - a.id)
    .slice(0, 3);
  const remaining = data.count - recent.length;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: data.x + 14, top: data.y - 10 }}
    >
      <div className="bg-gray-900 text-white rounded-xl shadow-2xl border border-white/10 p-3 w-64 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
          <span className="font-bold text-sm text-blue-300">{data.regionName}</span>
          <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold">
            {data.count} proy.
          </span>
        </div>

        {/* proyectos list */}
        <div className="space-y-1.5">
          {recent.map((p) => (
            <div key={p.id} className="flex gap-2 items-start">
              <span className="shrink-0 text-[9px] font-extrabold text-gray-400 w-5 text-right">
                #{p.id}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-blue-200 truncate">
                  {p.codigo || '—'}
                </p>
                <p className="text-[9px] text-gray-400 line-clamp-2 leading-snug">
                  {p.nombre}
                </p>
              </div>
            </div>
          ))}
          {remaining > 0 && (
            <p className="text-[9px] text-gray-500 italic pt-1 border-t border-white/10">
              + {remaining} proyecto{remaining > 1 ? 's' : ''} más
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PeruMapChart({ data }: PeruMapChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Filter out non-geographic regions and map to coordinates
  const bubbles = data
    .filter((d) => !isExcluded(d.regionName))
    .map((d) => ({
      ...d,
      coords: getCoords(d.regionName),
    }))
    .filter((d) => d.coords !== null) as Array<RegionBubble & { coords: [number, number] }>;

  const maxCount = Math.max(...bubbles.map((b) => b.count), 1);

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
  }, []);

  // Color scale based on count
  function bubbleColor(count: number, max: number) {
    const ratio = count / max;
    if (ratio > 0.75) return { fill: '#1d4ed8', stroke: '#93c5fd' }; // blue-700
    if (ratio > 0.5)  return { fill: '#2563eb', stroke: '#bfdbfe' }; // blue-600
    if (ratio > 0.25) return { fill: '#3b82f6', stroke: '#dbeafe' }; // blue-500
    return { fill: '#60a5fa', stroke: '#eff6ff' };                    // blue-400
  }

  const totalMapped   = bubbles.reduce((acc, b) => acc + b.count, 0);
  const totalFiltered = data.reduce((acc, b) => acc + b.count, 0);
  const unmapped      = totalFiltered - totalMapped;

  return (
    <div className="card w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Distribución Geográfica de Proyectos
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Mapa proporcional por departamento — tamaño de burbuja = N° proyectos
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unmapped > 0 && (
            <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full font-semibold">
              {unmapped} proy. sin ubicación estándar
            </span>
          )}
          <span className="text-[10px] text-gray-400 font-normal italic">
            Hover para ver detalle
          </span>
        </div>
      </div>

      {/* Map + Legend Layout */}
      <div className="flex gap-6 items-start">
        {/* SVG Map */}
        <div className="flex-1 flex justify-center">
          <svg
            ref={svgRef}
            viewBox="0 0 310 480"
            className="w-full max-w-[320px] h-auto"
            style={{ overflow: 'visible' }}
          >
            {/* Background glow */}
            <defs>
              <filter id="bubble-glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="map-shadow">
                <feDropShadow dx="1" dy="2" stdDeviation="3" floodOpacity="0.12" />
              </filter>
            </defs>

            {/* Peru silhouette */}
            <path
              d={PERU_PATH}
              fill="#f0f4ff"
              stroke="#c7d2fe"
              strokeWidth="1.5"
              strokeLinejoin="round"
              filter="url(#map-shadow)"
            />

            {/* Subtle grid dots */}
            {bubbles.map((b) => (
              <circle
                key={`dot-${b.regionId}`}
                cx={b.coords[0]}
                cy={b.coords[1]}
                r={2}
                fill="#c7d2fe"
                opacity={0.4}
              />
            ))}

            {/* Bubbles — sorted ascending so larger ones render on top */}
            {[...bubbles]
              .sort((a, b) => a.count - b.count)
              .map((b) => {
                const r = bubbleRadius(b.count, maxCount);
                const colors = bubbleColor(b.count, maxCount);
                return (
                  <g
                    key={`bubble-${b.regionId}`}
                    style={{ cursor: 'pointer' }}
                    onMouseMove={(e) => handleMouseMove(e, b)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {/* Outer pulse ring */}
                    <circle
                      cx={b.coords[0]}
                      cy={b.coords[1]}
                      r={r + 4}
                      fill={colors.fill}
                      opacity={0.15}
                    />
                    {/* Main bubble */}
                    <circle
                      cx={b.coords[0]}
                      cy={b.coords[1]}
                      r={r}
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth={1.5}
                      opacity={0.88}
                      filter="url(#bubble-glow)"
                      className="transition-all duration-150 hover:opacity-100"
                    />
                    {/* Count label (only if bubble is big enough) */}
                    {r >= 12 && (
                      <text
                        x={b.coords[0]}
                        y={b.coords[1] + 4}
                        textAnchor="middle"
                        fontSize={r >= 18 ? 10 : 8}
                        fontWeight="800"
                        fill="white"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {b.count}
                      </text>
                    )}
                  </g>
                );
              })}
          </svg>
        </div>

        {/* Legend + Region List */}
        <div className="w-52 shrink-0 space-y-3 pt-2">
          {/* Scale Legend */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Escala
            </p>
            <div className="flex items-end gap-3">
              {[0.25, 0.5, 1].map((ratio, i) => {
                const r = bubbleRadius(Math.round(maxCount * ratio), maxCount);
                const labels = ['Bajo', 'Medio', 'Alto'];
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      style={{
                        width: r * 2,
                        height: r * 2,
                        borderRadius: '50%',
                        background: '#2563eb',
                        opacity: 0.7,
                      }}
                    />
                    <span className="text-[9px] text-gray-400">{labels[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Region ranking */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Top Regiones
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200">
              {[...bubbles]
                .sort((a, b) => b.count - a.count)
                .map((b, i) => {
                  const pct = maxCount > 0 ? (b.count / maxCount) * 100 : 0;
                  return (
                    <div
                      key={b.regionId}
                      className="group cursor-default"
                      onMouseMove={(e) => handleMouseMove(e, b)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-gray-300 w-4 text-right">
                            {i + 1}.
                          </span>
                          <span className="text-[10px] font-semibold text-gray-700 leading-tight">
                            {b.regionName}
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold text-blue-700">
                          {b.count}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1">
                        <div
                          className="h-1 bg-blue-500 rounded-full transition-all duration-300 group-hover:bg-blue-600"
                          style={{ width: `${pct}%` }}
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
    </div>
  );
}
