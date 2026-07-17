// ─────────────────────────────────────────────────────────────────────────────
// Matriz centralizada de permisos (módulos visibles en Sidebar y rutas permitidas)
// ─────────────────────────────────────────────────────────────────────────────

export const SUPER_ADMIN = 'jduran@fondoempleo.com.pe';

// Módulos por usuario (nombres exactos usados en el Sidebar)
export const MODULOS_POR_USUARIO: Record<string, string[] | 'ALL'> = {
    // 'Supervisión' (mostrado como "Monitoreo"), 'Gestión de Monitores' y 'Evaluación'
    // son exclusivos del super admin (jduran, vía 'ALL') — no asignarlos aquí.
    // 'Inf. Gerencial' es restringido: solo rcarbajal, pricra y el super admin.
    // 'Catálogos': edita solo el super admin; rcarbajal y erizabal lo VEN (solo lectura).
    'jduran@fondoempleo.com.pe': 'ALL',
    'invitado@fondoempleo.com.pe': ['Proyectos', 'Servicios'],
    'rcarbajal@fondoempleo.com.pe': ['Inf. Gerencial', 'Proyectos', 'Servicios', 'Documentos', 'Gestión de Proyectos', 'Gestión de Servicios', 'Gestión de Aportantes', 'Catálogos'],
    'pricra@fondoempleo.com.pe': ['Inf. Gerencial', 'Proyectos', 'Servicios', 'Gestión de Aportantes'],
    'herique@fondoempleo.com.pe': ['Proyectos', 'Servicios'],
    'arojas@fondoempleo.com.pe': ['Proyectos', 'Servicios', 'Gestión de Proyectos', 'Gestión de Servicios'],
    'erizabal@fondoempleo.com.pe': ['Proyectos', 'Servicios', 'Gestión de Proyectos', 'Gestión de Servicios', 'Catálogos'],
    'jleclere@fondoempleo.com.pe': ['Proyectos'],
    'jbozzo@fondoempleo.com.pe': ['Proyectos'],
    'emoya@fondoempleo.com.pe': ['Servicios', 'Gestión de Servicios'],
    'hmeza@fondoempleo.com.pe': ['Proyectos', 'Servicios'],
    'pconcha@fondoempleo.com.pe': ['Proyectos', 'Servicios', 'Documentos'],
};

// Mapa de módulo → ruta principal (para validación en middleware)
export const RUTA_POR_MODULO: Record<string, string> = {
    'Inf. Gerencial': '/dashboard/inf-gerencial',
    'Proyectos': '/dashboard',
    'Servicios': '/dashboard/servicios',
    'Supervisión': '/dashboard/campo',
    'Gestión de Monitores': '/dashboard/gestion-monitores',
    'Documentos': '/dashboard/documentos',
    'Evaluación': '/dashboard/evaluacion',
    'Gestión de Proyectos': '/dashboard/gestion-proyectos',
    'Gestión de Servicios': '/dashboard/gestion-servicios',
    'Gestión de Aportantes': '/dashboard/gestion-aportantes',
    'Catálogos': '/dashboard/catalogos', // solo super admin (ver Sidebar y guardas de página)
};

// Rutas que siempre están permitidas sin importar el perfil
export const RUTAS_PUBLICAS_AUTENTICADO = [
    '/dashboard',
    '/auth/signout',
    '/auth/callback',
    '/presentation',
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getNormalizedEmail(email?: string | null): string {
    return email ? email.toLowerCase().trim() : '';
}

/** Devuelve true si el usuario tiene acceso al módulo indicado */
export function tieneAccesoModulo(email: string | null | undefined, modulo: string): boolean {
    const norm = getNormalizedEmail(email);
    if (norm === SUPER_ADMIN) return true;
    const permisos = MODULOS_POR_USUARIO[norm];
    if (!permisos) return false;
    if (permisos === 'ALL') return true;
    return permisos.includes(modulo);
}

/** Devuelve los módulos visibles para un usuario (para el Sidebar) */
export function getModulosVisibles(email: string | null | undefined): string[] | 'ALL' {
    const norm = getNormalizedEmail(email);
    const permisos = MODULOS_POR_USUARIO[norm];
    if (!permisos) return []; // usuario no conocido → sin acceso
    return permisos;
}

/** Puede VER el módulo Catálogos (super admin o usuarios con el módulo asignado). */
export function puedeVerCatalogos(email: string | null | undefined): boolean {
    const norm = getNormalizedEmail(email);
    return norm === SUPER_ADMIN || tieneAccesoModulo(norm, 'Catálogos');
}

/** Puede EDITAR (crear/actualizar/eliminar) en Catálogos: solo el super admin. */
export function puedeEditarCatalogos(email: string | null | undefined): boolean {
    return getNormalizedEmail(email) === SUPER_ADMIN;
}

/** Devuelve true si el usuario puede realizar acciones de evaluación */
export function puedeRealizarAccionesEvaluacion(email: string | null | undefined): boolean {
    const norm = getNormalizedEmail(email);
    if (norm === 'hmeza@fondoempleo.com.pe') return false;
    return true; // jduran y otros permitidos por defecto (u otra lógica futura)
}

/** Devuelve true si la ruta pathname está permitida para el usuario */
export function isRutaPermitida(email: string | null | undefined, pathname: string): boolean {
    const norm = getNormalizedEmail(email);

    // Super Admin tiene acceso absoluto
    if (norm === SUPER_ADMIN) return true;

    // Rutas públicas para todos los autenticados
    if (RUTAS_PUBLICAS_AUTENTICADO.some(r => pathname === r || pathname.startsWith(r + '/'))) {
        return true;
    }

    const modulos = MODULOS_POR_USUARIO[norm];
    if (!modulos) return false;
    if (modulos === 'ALL') return true;

    // Verificar si la ruta corresponde a alguno de los módulos permitidos
    return modulos.some(modulo => {
        const ruta = RUTA_POR_MODULO[modulo];
        return ruta && (pathname === ruta || pathname.startsWith(ruta + '/'));
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy (mantener compatibilidad con código existente de campo/erizabal/jleclere/jbozzo)
// ─────────────────────────────────────────────────────────────────────────────

export type PermisosUsuario = {
    modulosBloqueados?: string[];
    modulosPermitidos?: string[];
    rutasBloqueadas?: string[];
    rutasPermitidas?: string[];
};

export function getUserPermissions(email?: string | null): PermisosUsuario | null {
    const norm = getNormalizedEmail(email);
    if (norm === SUPER_ADMIN) return null; // null = sin restricciones
    const modulos = MODULOS_POR_USUARIO[norm];
    if (!modulos || modulos === 'ALL') return null;
    return { modulosPermitidos: modulos };
}

// PERMISOS_POR_USUARIO se mantiene solo para no romper imports existentes
export const PERMISOS_POR_USUARIO: Record<string, PermisosUsuario> = {};
