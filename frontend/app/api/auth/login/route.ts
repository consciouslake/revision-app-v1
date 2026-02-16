import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            return NextResponse.json(
                { message: 'Server misconfiguration: ADMIN_PASSWORD not set' },
                { status: 500 }
            );
        }

        console.log(`[LOGIN DEBUG] Input: '${password}' (${password?.length}) | Env: '${adminPassword}' (${adminPassword?.length})`);

        if (password === adminPassword.trim()) {
            // Set the cookie
            const cookieStore = await cookies();
            cookieStore.set('auth_token', 'valid_admin_session', {
                httpOnly: true,
                secure: false, // process.env.NODE_ENV === 'production', (Disabled for HTTP-only Oracle Cloud deployment)
                sameSite: 'lax', // Relaxed for redirect compatibility
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: '/',
            });

            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json(
                { message: 'Invalid password' },
                { status: 401 }
            );
        }
    } catch (error) {
        return NextResponse.json(
            { message: 'An error occurred' },
            { status: 500 }
        );
    }
}
