import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getNormalizedEmail, isRutaPermitida, SUPER_ADMIN } from '@/config/permissions'

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
                    request.cookies.set({ name, value, ...options })
                    response = NextResponse.next({ request: { headers: request.headers } })
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options })
                    response = NextResponse.next({ request: { headers: request.headers } })
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const { pathname } = request.nextUrl;

    // ── 1. Usuario NO autenticado ─────────────────────────────────────────────
    const isAuthRoute = pathname.startsWith('/auth/');
    if (!user) {
        // Dejar pasar rutas de auth (login, callback, signout)
        if (isAuthRoute) return response;
        // Redirigir al login cualquier otra ruta
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // ── 2. Usuario autenticado ────────────────────────────────────────────────
    const email = getNormalizedEmail(user.email);

    // Super Admin: acceso incondicional a todo
    if (email === SUPER_ADMIN) return response;

    // /presentation es pública para todos los autenticados
    if (pathname.startsWith('/presentation')) return response;

    // Rutas de auth siempre permitidas (signout, callback)
    if (isAuthRoute) return response;

    // ── 3. Verificar permisos para rutas /dashboard/* ─────────────────────────
    if (pathname.startsWith('/dashboard')) {
        if (!isRutaPermitida(email, pathname)) {
            // Evitar bucle: /dashboard siempre es permitido
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
