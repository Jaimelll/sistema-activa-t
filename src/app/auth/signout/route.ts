import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const base = `${protocol}://${host}`;

    // Sign out on the server side (clears httpOnly cookies)
    await supabase.auth.signOut();

    return NextResponse.redirect(new URL('/', base), {
        status: 302,
    });
}

export async function GET(request: Request) {
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const base = `${protocol}://${host}`;

    // Sign out on the server side (clears httpOnly cookies)
    await supabase.auth.signOut();

    return NextResponse.redirect(new URL('/', base), {
        status: 302,
    });
}
