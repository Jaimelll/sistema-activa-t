// ─────────────────────────────────────────────────────────────────────────────
// Lista BLANCA de tablas de referencia editables desde el módulo Catálogos.
//
// El nombre de la tabla llega por la URL (/dashboard/catalogos/[tabla]) y se usa
// para construir consultas dinámicas. Por seguridad SOLO se permite operar sobre
// tablas declaradas aquí — cualquier otra devuelve 404 / "tabla no permitida".
//
// A diferencia de compras2, estas tablas NO comparten la misma estructura: el
// editor descubre las columnas reales de cada una en tiempo de ejecución
// (ver getColumnas en actions.ts), así que agregar una tabla a esta lista basta
// para que aparezca y sea editable.
// ─────────────────────────────────────────────────────────────────────────────

export const TABLAS = [
    'lineas',
    'ejes',
    'modalidades',
    'etapas',
    'regiones',
    'especialistas',
    'condicion',
    'institucion',
    'grupo',
    'tipo_estudio',
    'naturaleza_ie',
    'formato',
    'sectores_ciiu',
    'informe_impacto',
    'unidades_operativas',
    'presupuesto_anual_comparativo',
    'presupuesto_mensual',
    'finanzas_anual',
    'saldo_bancario',
] as const;

export type Tabla = (typeof TABLAS)[number];

/** True si `t` es un catálogo permitido (guarda de seguridad). */
export function esTablaValida(t: string): t is Tabla {
    return (TABLAS as readonly string[]).includes(t);
}

/** Etiquetas personalizadas (las demás se derivan del nombre de la tabla). */
const ETIQUETAS: Record<string, string> = {
    lineas: 'Líneas',
    institucion: 'Instituciones',
    condicion: 'Condiciones',
    tipo_estudio: 'Tipos de estudio',
    naturaleza_ie: 'Naturaleza IE',
    sectores_ciiu: 'Sectores CIIU',
    informe_impacto: 'Informes de Impacto',
    unidades_operativas: 'Unidades Operativas',
    presupuesto_anual_comparativo: 'Presupuesto Anual (POI vs Ejecutado)',
    presupuesto_mensual: 'Presupuesto Mensual',
    finanzas_anual: 'Finanzas Anuales (Rubros)',
    saldo_bancario: 'Saldos Bancarios (por banco)',
};

/** Etiqueta legible para una tabla ("tipo_estudio" → "Tipo Estudio"). */
export function etiquetaTabla(t: string): string {
    return (
        ETIQUETAS[t] ??
        t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    );
}

/**
 * Columnas que NO se muestran en el editor (siguen existiendo en la BD).
 * Útil para campos que hoy no se gestionan desde la UI.
 */
export const COLUMNAS_OCULTAS: Record<string, string[]> = {
    informe_impacto: ['linea_id', 'created_at'],
    finanzas_anual: ['created_at'],
    saldo_bancario: ['created_at'],
};

/**
 * Orden de las filas en la grilla, por tabla (columnas en orden de prioridad).
 * Sin entrada aquí, se ordena por la clave primaria.
 */
export const ORDEN_FILAS: Record<string, string[]> = {
    finanzas_anual: ['año', 'rubro'],
    presupuesto_mensual: ['año', 'mes', 'unidad_operativa_id'],
    presupuesto_anual_comparativo: ['año', 'unidad_operativa_id'],
    saldo_bancario: ['año', 'banco'],
};

/**
 * Columnas de referencia que se editan con un combo en lugar de un número.
 * Dos variantes:
 *  - Desde tabla: `tabla` es el catálogo de donde salen las opciones
 *    (valor = columna id, etiqueta = columna descriptiva, filtro opcional).
 *  - Estático: `estatico` es la lista fija de opciones (p. ej. meses).
 * `libre: true` permite además escribir un valor que no está en la lista.
 */
export type ComboConfig = {
    tabla?: string;
    valor?: string;
    etiqueta?: string;
    /** Columna adicional para la etiqueta ("SIGLAS — Nombre completo"). */
    etiquetaExtra?: string;
    filtro?: [string, any];
    estatico?: { value: any; label: string }[];
    libre?: boolean;
};

const MESES: { value: number; label: string }[] = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Setiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
];

export const COLUMNAS_COMBO: Record<string, Record<string, ComboConfig>> = {
    informe_impacto: {
        grupo_id: { tabla: 'grupo', valor: 'id', etiqueta: 'descripcion', filtro: ['tipo', 2] },
    },
    presupuesto_anual_comparativo: {
        unidad_operativa_id: { tabla: 'unidades_operativas', valor: 'id', etiqueta: 'siglas', etiquetaExtra: 'nombre_completo' },
    },
    presupuesto_mensual: {
        unidad_operativa_id: { tabla: 'unidades_operativas', valor: 'id', etiqueta: 'siglas', etiquetaExtra: 'nombre_completo' },
        mes: { estatico: MESES },
    },
    finanzas_anual: {
        // Combos fijos SIN texto libre: los gráficos de Inf. Gerencial y la
        // vista de Presentación buscan estos nombres exactos.
        rubro: {
            estatico: [
                { value: 'Aportes', label: 'Aportes' },
                { value: 'Intereses', label: 'Intereses' },
                { value: 'G. Operativos', label: 'G. Operativos' },
                { value: 'Proyectos', label: 'Proyectos' },
                { value: 'Becas', label: 'Becas' },
                { value: 'Saldos en Bancos', label: 'Saldos en Bancos' },
            ],
        },
        escenario: {
            estatico: [
                { value: 'Real', label: 'Real' },
                { value: 'Proyectado', label: 'Proyectado' },
            ],
        },
    },
    saldo_bancario: {
        // Sugerencias con los bancos ya registrados + texto libre para nuevos.
        banco: { tabla: 'saldo_bancario', valor: 'banco', etiqueta: 'banco', libre: true },
    },
};

/** Metadatos de una columna descubierta por introspección (ver actions.getColumnas). */
export type Columna = {
    name: string;
    /** Tipo Postgres crudo (information_schema) o inferido del valor. */
    type: string;
    isPk: boolean;
    nullable: boolean;
    /** True si la columna tiene DEFAULT (uuid/serial/now): se oculta al crear. */
    hasDefault: boolean;
};
