// Supabase (PostgREST) devuelve como máximo 1000 filas por request.
// Este helper pagina con .range() hasta traer la tabla completa.
// buildQuery debe construir la consulta *desde cero* en cada llamada,
// aplicando .range(from, to) al final.
export async function fetchAllRows<T = any>(
    buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
    pageSize = 1000
): Promise<{ data: T[]; error: any }> {
    const all: T[] = [];
    for (let from = 0; ; from += pageSize) {
        const { data, error } = await buildQuery(from, from + pageSize - 1);
        if (error) return { data: all, error };
        all.push(...(data || []));
        if (!data || data.length < pageSize) break;
    }
    return { data: all, error: null };
}
