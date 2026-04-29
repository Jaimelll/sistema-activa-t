export type PermisosUsuario = {
    modulosBloqueados?: string[];
    modulosPermitidos?: string[];
    rutasBloqueadas?: string[];
    rutasPermitidas?: string[];
};

export const PERMISOS_POR_USUARIO: Record<string, PermisosUsuario> = {
    'jleclere@fondoempleo.com.pe': {
        modulosPermitidos: ['Proyectos', 'Supervisión'],
        rutasPermitidas: ['/dashboard', '/dashboard/campo', '/auth/signout', '/auth/callback'],
    },
    'jbozzo@fondoempleo.com.pe': {
        modulosPermitidos: ['Proyectos', 'Supervisión'],
        rutasPermitidas: ['/dashboard', '/dashboard/campo', '/auth/signout', '/auth/callback'],
    },
    'jduran@fondoempleo.com.pe': {
        modulosPermitidos: [
            'Inf. Gerencial', 
            'Proyectos', 
            'Servicios', 
            'Gestión de Monitores', 
            'Supervisión',
            'Documentos',
            'Evaluación',
            'Gestión de Proyectos',
            'Gestión de Servicios',
            'Gestión de Aportantes',
            'Institución Ejecutora',
            'Configuración'
        ],
        rutasPermitidas: ['/dashboard', '/dashboard/inf-gerencial', '/dashboard/servicios', '/dashboard/gestion-monitores', '/dashboard/campo', '/auth/signout', '/auth/callback'],
    },
    'erizabal@fondoempleo.com.pe': {
        modulosPermitidos: ['Inf. Gerencial', 'Proyectos', 'Servicios', 'Gestión de Monitores'],
        rutasPermitidas: ['/dashboard', '/dashboard/inf-gerencial', '/dashboard/servicios', '/dashboard/gestion-monitores', '/dashboard/campo', '/auth/signout', '/auth/callback'],
    },
    'arojas@fondoempleo.com.pe': {
        modulosPermitidos: [
            'Inf. Gerencial', 
            'Proyectos', 
            'Servicios', 
            'Gestión de Proyectos', 
            'Gestión de Servicios',
            'Gestión de Monitores'
        ],
        rutasPermitidas: [
            '/dashboard', 
            '/dashboard/inf-gerencial', 
            '/dashboard/servicios', 
            '/dashboard/gestion-proyectos', 
            '/dashboard/gestion-servicios', 
            '/dashboard/gestion-monitores',
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
