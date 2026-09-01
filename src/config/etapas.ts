// ─────────────────────────────────────────────────────────────────────────────
// Rótulos de etapa según el eje.
//
// El catálogo `etapas` tiene UNA fila por posición del embudo, y su descripción
// hace dos trabajos a la vez: identifica la posición y le pone nombre. Eso
// funciona mientras todos los ejes recorran el mismo camino, y los de
// FONDOEMPLEO no lo hacen:
//
//   Ejes CONCURSALES (1 Actíva-T, 3 Apoyo a Trabajadores)
//     hay convocatoria → Bases → Lanzamiento → Aprobado → Firma → Ejecución
//
//   Ejes NO CONCURSALES (2 Sectorial, 4 Empresas de Sectores Aportantes)
//     no hay convocatoria, así que NO existe la fase "Etapa Concursal": el
//     proyecto entra directo a Acciones Preparatorias, donde negocia y subsana
//     hasta que el Consejo Directivo lo aprueba.
//
// La solución NO es crear etapas nuevas. Los ids de etapa son la columna
// vertebral del sistema —de ellos salen el color (STAGE_PALETTE[id-1]), el
// orden, la cascada de la línea de tiempo y constantes como EXECUTION_START_ID—
// y duplicar una posición del embudo bajo dos ids haría que ninguna consulta
// pudiera responder "cuántos proyectos están antes de aprobación" sin conocer
// las dos.
//
// Lo que se hace acá es más modesto y no toca la base: la POSICIÓN sigue siendo
// la misma (id 2 es id 2 para todos); lo único que cambia es cómo se la llama y
// a qué fase se la asigna cuando el proyecto es de un eje no concursal.
//
// Si algún día conviene que esto lo edite el usuario en vez de vivir acá, son
// dos columnas —`ejes.concursal` y `etapas.descripcion_alterna`/`fase_alterna`—
// y aparecen solas en el módulo Catálogos, que descubre las columnas en tiempo
// de ejecución (ver scripts/alias_etapas_por_eje.sql).
// ─────────────────────────────────────────────────────────────────────────────

/** Ejes sin convocatoria: sus proyectos no pasan por la fase "Etapa Concursal". */
export const EJES_NO_CONCURSALES = [2, 4];

/** Cómo se llama cada etapa cuando el eje NO es concursal. */
const ALIAS_NO_CONCURSAL: Record<number, { descripcion: string; fase: string }> = {
    // "Lanzamiento" no significa nada sin convocatoria. Acá esta posición es el
    // proyecto ya presentado por el sector, subsanando, todavía sin aprobación
    // del Consejo Directivo — o sea, una acción preparatoria.
    2: { descripcion: 'Por aprobar', fase: 'Acciones Preparatorias' },
};

export function esEjeConcursal(ejeId?: number | string | null): boolean {
    const id = Number(ejeId);
    return !Number.isFinite(id) || !EJES_NO_CONCURSALES.includes(id);
}

/** Descripción de una etapa para un proyecto de un eje concreto. */
export function etiquetaEtapa(
    etapaId?: number | string | null,
    ejeId?: number | string | null,
    descripcionBase?: string | null,
): string {
    const base = descripcionBase || 'Sin Etapa';
    if (esEjeConcursal(ejeId)) return base;
    return ALIAS_NO_CONCURSAL[Number(etapaId)]?.descripcion || base;
}

/** Fase de una etapa para un proyecto de un eje concreto. */
export function etiquetaFase(
    etapaId?: number | string | null,
    ejeId?: number | string | null,
    faseBase?: string | null,
): string {
    const base = faseBase || '';
    if (esEjeConcursal(ejeId)) return base;
    return ALIAS_NO_CONCURSAL[Number(etapaId)]?.fase || base;
}

/**
 * Rótulo de una etapa para una vista que puede mezclar ejes (la leyenda de la
 * línea de tiempo, por ejemplo). Si en pantalla conviven un eje concursal y uno
 * que no lo es, se muestran los dos nombres: decir solo uno sería mentir en la
 * mitad de las barras.
 */
export function etiquetaEtapaParaEjes(
    etapaId?: number | string | null,
    ejeIds: (number | string | null | undefined)[] = [],
    descripcionBase?: string | null,
): string {
    const base = descripcionBase || 'Sin Etapa';
    const alias = ALIAS_NO_CONCURSAL[Number(etapaId)]?.descripcion;
    if (!alias || ejeIds.length === 0) return base;

    const hayConcursal = ejeIds.some((e) => esEjeConcursal(e));
    const hayNoConcursal = ejeIds.some((e) => !esEjeConcursal(e));

    if (hayNoConcursal && !hayConcursal) return alias;
    if (hayNoConcursal && hayConcursal) return `${base} / ${alias}`;
    return base;
}
