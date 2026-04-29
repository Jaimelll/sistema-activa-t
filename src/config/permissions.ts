// ─────────────────────────────────────────────────────────────────────────────
// Matriz centralizada de permisos (módulos visibles en Sidebar y rutas permitidas)
// ─────────────────────────────────────────────────────────────────────────────

export const SUPER_ADMIN = 'jduran@fondoempleo.com.pe';

// Módulos por usuario (nombres exactos usados en el Sidebar)
export const MODULOS_POR_USUARIO: Record<string, string[] | 'ALL'> = {
    'jduran@fondoempleo.com.pe':    'ALL',
    'invitado@fondoempleo.com.pe':  ['Inf. Gerencial', 'Proyectos', 'Servicios'],
    'rcarbajal@fondoempleo.com.pe': ['Inf. Gerencial', 'Proyectos', 'Servicios', 'Documentos', 'Gestión de Proyectos', 'Gestión de Servicios', 'Gestión de Aportantes'],
    'pricra@fondoempleo.com.pe':    ['Inf. Gerencial', 'Proyectos', 'Servicios', 'Gestión de Aportantes'],
    'arojas@fondoempleo.com.pe':    ['Inf. Gerencial', 'Proyectos', 'Servicios', 'Gestión de Proyectos', 'Gestión de Servicios'],
    'erizabal@fondoempleo.com.pe':  ['Inf. Gerencial', 'Proyectos', 'Servicios', 'Gestión de Monitores'],
    'jleclere@fondoempleo.com.pe':  ['Proyectos', 'Supervisión'],
    'jbozzo@fondoempleo.com.pe':    ['Proyectos', 'Supervisión'],
};

// Mapa de módulo → ruta principal (para validación en middleware)
export const RUTA_POR_MODULO: Record<string, string> = {
    'Inf. Gerencial':       '/dashboard/inf-gerencial',
    'Proyectos':            '/dashboard',
    'Servicios':            '/dashboard/servicios',
    'Supervisión':          '/dashboard/campo',
    'Gestión de Monitores': '/dashboard/gestion-monitores',
    'Documentos':           '/dashboard/documentos',
    'Evaluación':           '/dashboard/evaluacion',
    'Gestión de Proyectos': '/dashboard/gestion-proyectos',
    'Gestión de Servicios': '/dashboard/gestion-servicios',
    'Gestión de Aportantes':'/dashboard/gestion-aportantes',
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
