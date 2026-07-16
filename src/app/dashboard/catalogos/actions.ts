"use server";

// ─────────────────────────────────────────────────────────────────────────────
// Server actions del módulo Catálogos.
//
// Acceso EXCLUSIVO del super admin (jduran). Cada acción revalida la identidad
// del usuario vía el cliente SSR (defensa en profundidad: no confiamos solo en
// el middleware). Las escrituras usan el cliente admin (service role) para
// sortear RLS, igual que el resto de módulos de gestión.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import { createClient as createSSRClient } from '@/utils/supabase/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getNormalizedEmail, SUPER_ADMIN } from '@/config/permissions';
import { esTablaValida, type Columna } from './tablas';

// Tag de los catálogos cacheados con unstable_cache en src/app/dashboard/actions.ts
// (líneas, ejes, etapas, regiones, especialistas, etc. — TTL 1 hora). Toda
// escritura desde este módulo DEBE invalidarlo, o el resto de la app seguirá
// sirviendo la lista vieja hasta por una hora.
const CATALOG_TAG = 'catalogos';

function invalidarCatalogos(tabla: string) {
    revalidateTag(CATALOG_TAG, 'max'); // Next 16 exige el 2º arg; 'max' = invalidación total
    revalidatePath(`/dashboard/catalogos/${tabla}`);
    revalidatePath('/dashboard/catalogos');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminSupabase() {
    return createClient(supabaseUrl, supabaseServiceKey);
}

/** Lanza si el usuario actual no es el super admin. */
async function assertSuperAdmin() {
    const supabase = await createSSRClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (getNormalizedEmail(user?.email) !== SUPER_ADMIN) {
        throw new Error('No autorizado: este módulo es solo para el super admin.');
    }
}

function assertTabla(tabla: string) {
    if (!esTablaValida(tabla)) {
        throw new Error(`Tabla no permitida: "${tabla}".`);
    }
}

// ─── Introspección de columnas ─────────────────────────────────────────────────

function inferTypeFromValue(v: unknown): string {
    if (typeof v === 'number') return 'numeric';
    if (typeof v === 'boolean') return 'boolean';
    if (typeof v === 'string') {
        if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return 'timestamp';
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'date';
    }
    return 'text';
}

/**
 * Descubre las columnas de una tabla. Intenta primero el RPC
 * `catalogo_columnas` (preciso: tipos reales, PK real, defaults — ver
 * scripts/catalogo_introspection.sql). Si el RPC no existe, cae a inferir desde
 * una fila de muestra asumiendo PK = "id".
 */
export async function getColumnas(tabla: string): Promise<Columna[]> {
    await assertSuperAdmin();
    assertTabla(tabla);
    const sb = getAdminSupabase();

    const { data, error } = await sb.rpc('catalogo_columnas', { p_tabla: tabla });
    if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((c: any) => ({
            name: c.column_name as string,
            type: c.data_type as string,
            isPk: Boolean(c.is_pk),
            nullable: Boolean(c.is_nullable),
            hasDefault: Boolean(c.has_default),
        }));
    }

    // Fallback: inferir desde una fila de muestra.
    const { data: rows } = await sb.from(tabla).select('*').limit(1);
    const sample = rows?.[0];
    if (sample) {
        return Object.keys(sample).map((k) => {
            const isId = k === 'id';
            const val = (sample as Record<string, unknown>)[k];
            const looksUuid =
                typeof val === 'string' &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(val);
            return {
                name: k,
                type: inferTypeFromValue(val),
                isPk: isId,
                nullable: true,
                // uuid/timestamps suelen tener default; el id entero manual no.
                hasDefault: (isId && looksUuid) || /_at$|created/.test(k),
            };
        });
    }

    return [];
}

// ─── Lectura de filas ──────────────────────────────────────────────────────────

export async function getFilas(tabla: string): Promise<Record<string, any>[]> {
    await assertSuperAdmin();
    assertTabla(tabla);
    const sb = getAdminSupabase();
    const { data, error } = await sb.from(tabla).select('*');
    if (error) throw new Error(error.message);
    return data ?? [];
}

export async function getConteo(tabla: string): Promise<number> {
    await assertSuperAdmin();
    assertTabla(tabla);
    const sb = getAdminSupabase();
    const { count, error } = await sb
        .from(tabla)
        .select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count ?? 0;
}

// ─── Coerción de valores del formulario ────────────────────────────────────────

function esNumerico(type: string) {
    return /int|numeric|double|real|decimal|float|serial/i.test(type);
}
function esBooleano(type: string) {
    return /bool/i.test(type);
}

/** Limpia un payload según el tipo de cada columna (""→null, "5"→5, etc.). */
function coerce(
    valores: Record<string, any>,
    columnas: Columna[],
): Record<string, any> {
    const byName = new Map(columnas.map((c) => [c.name, c]));
    const out: Record<string, any> = {};
    for (const [k, raw] of Object.entries(valores)) {
        const col = byName.get(k);
        if (!col) continue; // ignora columnas desconocidas (anti-inyección)
        if (esBooleano(col.type)) {
            out[k] = Boolean(raw);
            continue;
        }
        const s = raw === null || raw === undefined ? '' : String(raw).trim();
        if (s === '') {
            out[k] = null;
            continue;
        }
        if (esNumerico(col.type)) {
            const n = Number(s);
            out[k] = Number.isFinite(n) ? n : null;
            continue;
        }
        out[k] = s;
    }
    return out;
}

// ─── Escritura (CRUD) ──────────────────────────────────────────────────────────

export async function crearFila(
    tabla: string,
    valores: Record<string, any>,
): Promise<{ ok: boolean; error?: string }> {
    await assertSuperAdmin();
    assertTabla(tabla);
    const columnas = await getColumnas(tabla);
    // Al crear, ignoramos columnas con default si vienen vacías.
    const payload = coerce(valores, columnas);
    for (const c of columnas) {
        if (c.hasDefault && (payload[c.name] === null || payload[c.name] === undefined)) {
            delete payload[c.name];
        }
        // PK vacía: dejar que la genere la BD (columnas identity reportan
        // has_default=false en information_schema, p.ej. informe_impacto.id).
        if (c.isPk && (payload[c.name] === null || payload[c.name] === undefined)) {
            delete payload[c.name];
        }
    }
    const sb = getAdminSupabase();
    const { error } = await sb.from(tabla).insert(payload);
    if (error) return { ok: false, error: error.message };
    invalidarCatalogos(tabla);
    return { ok: true };
}

export async function actualizarFila(
    tabla: string,
    pkCol: string,
    pkVal: string | number,
    valores: Record<string, any>,
): Promise<{ ok: boolean; error?: string }> {
    await assertSuperAdmin();
    assertTabla(tabla);
    const columnas = await getColumnas(tabla);
    const payload = coerce(valores, columnas);
    delete payload[pkCol]; // nunca actualizamos la PK
    const sb = getAdminSupabase();
    const { error } = await sb.from(tabla).update(payload).eq(pkCol, pkVal);
    if (error) return { ok: false, error: error.message };
    invalidarCatalogos(tabla);
    return { ok: true };
}

// ─── Subida de archivos (columnas archivo_url) ─────────────────────────────────

const BUCKET_ARCHIVOS = 'informes_impacto';

function sanitizeFileName(fileName: string): string {
    return fileName
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .toLowerCase();
}

/**
 * Sube un PDF al bucket de informes y devuelve su URL pública. Lo usa el
 * editor de catálogos para llenar columnas `archivo_url`.
 */
export async function subirArchivoCatalogo(
    formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
    await assertSuperAdmin();
    const file = formData.get('archivo') as File | null;
    if (!file || file.size === 0) {
        return { ok: false, error: 'Debe seleccionar un archivo PDF.' };
    }
    if (file.size > 20 * 1024 * 1024) {
        return { ok: false, error: 'El archivo excede el límite de 20 MB.' };
    }
    const sb = getAdminSupabase();
    const fileName = `${Date.now()}_${sanitizeFileName(file.name)}`;
    const { data, error } = await sb.storage
        .from(BUCKET_ARCHIVOS)
        .upload(fileName, file, { contentType: file.type || 'application/pdf' });
    if (error) return { ok: false, error: error.message };
    const { data: urlData } = sb.storage.from(BUCKET_ARCHIVOS).getPublicUrl(data.path);
    return { ok: true, url: urlData.publicUrl };
}

export async function eliminarFila(
    tabla: string,
    pkCol: string,
    pkVal: string | number,
): Promise<{ ok: boolean; error?: string }> {
    await assertSuperAdmin();
    assertTabla(tabla);
    const sb = getAdminSupabase();
    const { error } = await sb.from(tabla).delete().eq(pkCol, pkVal);
    if (error) {
        const msg = /foreign key|violates/i.test(error.message)
            ? 'No se puede eliminar: el elemento está en uso por otros registros.'
            : error.message;
        return { ok: false, error: msg };
    }
    invalidarCatalogos(tabla);
    return { ok: true };
}
