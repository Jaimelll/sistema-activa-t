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
};

/**
 * Columnas de referencia que se editan con un combo en lugar de un número.
 * `tabla` es el catálogo de donde salen las opciones (valor = columna id,
 * etiqueta = columna descriptiva, filtro opcional [columna, valor]).
 */
export const COLUMNAS_COMBO: Record<
    string,
    Record<string, { tabla: string; valor: string; etiqueta: string; filtro?: [string, any] }>
> = {
    informe_impacto: {
        grupo_id: { tabla: 'grupo', valor: 'id', etiqueta: 'descripcion', filtro: ['tipo', 2] },
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
