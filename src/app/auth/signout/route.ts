import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const requestUrl = new URL(request.url);
    const supabase = await createClient();

    // Sign out on the server side (clears httpOnly cookies)
    await supabase.auth.signOut();

    return NextResponse.redirect(new URL('/', requestUrl.origin), {
        status: 302,
    });
}

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const supabase = await createClient();

    // Sign out on the server side (clears httpOnly cookies)
    await supabase.auth.signOut();

    return NextResponse.redirect(new URL('/', requestUrl.origin), {
        status: 302,
    });
}
