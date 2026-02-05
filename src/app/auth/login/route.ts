import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const formData = await request.formData();
    const email = String(formData.get('email'));
    const password = String(formData.get('password'));
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const base = `${protocol}://${host}`;

    if (error) {
        return NextResponse.redirect(new URL('/?error=CredencialesInvalidas', base), {
            status: 302,
        });
    }

    return NextResponse.redirect(new URL('/dashboard', base), {
        status: 302,
    });
}
