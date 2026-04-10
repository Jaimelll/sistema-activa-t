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
    },
    'pricra@fondoempleo.com.pe': {
        modulosPermitidos: ['Proyectos', 'Servicios', 'Inf. Gerencial', 'Gestión de Aportantes'],
        rutasPermitidas: [
            '/dashboard', 
            '/dashboard/servicios', 
            '/dashboard/inf-gerencial', 
            '/dashboard/gestion-aportantes', 
            '/auth/signout', 
            '/auth/callback'
        ],
    },
    'arojas@fondoempleo.com.pe': {
        modulosPermitidos: [
            'Inf. Gerencial', 
            'Proyectos', 
            'Servicios', 
            'Gestión de Proyectos', 
            'Gestión de Servicios'
        ],
        rutasPermitidas: [
            '/dashboard', 
            '/dashboard/inf-gerencial', 
            '/dashboard/servicios', 
            '/dashboard/gestion-proyectos', 
            '/dashboard/gestion-servicios', 
            '/auth/signout', 
            '/auth/callback'
        ],
    }
};

export function getNormalizedEmail(email?: string | null): string {
    return email ? email.toLowerCase().trim() : '';
}

export function getUserPermissions(email?: string | null): PermisosUsuario | null {
    const normalizedEmail = getNormalizedEmail(email);
    return PERMISOS_POR_USUARIO[normalizedEmail] || null;
}
