import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { PERMISOS_POR_USUARIO, getNormalizedEmail } from '@/config/permissions'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (user && user.email) {
        const email = getNormalizedEmail(user.email);
        const { pathname } = request.nextUrl;

        // La ruta /presentation es pública para todos los usuarios autenticados
        // Se usa para el Web Viewer de PowerPoint — nunca se bloquea por permisos de módulo
        if (pathname.startsWith('/presentation')) {
            return response;
        }

        const permisos = PERMISOS_POR_USUARIO[email];

        if (permisos) {
            let isAllowedRoute = true;

            if (permisos.rutasPermitidas && !permisos.rutasPermitidas.includes(pathname)) {
                isAllowedRoute = false;
            }
            if (permisos.rutasBloqueadas && permisos.rutasBloqueadas.some(r => pathname.startsWith(r))) {
                isAllowedRoute = false;
            }

            if (!isAllowedRoute) {
                return NextResponse.redirect(new URL('/dashboard?error=restriccion', request.url), 307);
            }
        }
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
