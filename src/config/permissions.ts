export type PermisosUsuario = {
    modulosBloqueados?: string[];
    modulosPermitidos?: string[];
    rutasBloqueadas?: string[];
    rutasPermitidas?: string[];
};

export const PERMISOS_POR_USUARIO: Record<string, PermisosUsuario> = {
    'rcarbajal@fondoempleo.com.pe': {
        modulosBloqueados: ['Institución Ejecutora', 'Configuración'],
        rutasBloqueadas: ['/dashboard/institucion-ejecutora', '/dashboard/settings'],
    },
    // Variante rcabajal por robustez histórica del código
    'rcabajal@fondoempleo.com.pe': {
        modulosBloqueados: ['Institución Ejecutora', 'Configuración'],
        rutasBloqueadas: ['/dashboard/institucion-ejecutora', '/dashboard/settings'],
    },
    'invitado@fondoempleo.com.pe': {
        modulosPermitidos: ['Proyectos', 'Servicios', 'Inf. Gerencial'],
        rutasPermitidas: ['/dashboard', '/dashboard/servicios', '/dashboard/inf-gerencial', '/auth/signout', '/auth/callback'],
    }
};

export function getNormalizedEmail(email?: string | null): string {
    return email ? email.toLowerCase().trim() : '';
}

export function getUserPermissions(email?: string | null): PermisosUsuario | null {
    const normalizedEmail = getNormalizedEmail(email);
    return PERMISOS_POR_USUARIO[normalizedEmail] || null;
}
