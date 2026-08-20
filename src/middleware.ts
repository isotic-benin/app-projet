import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // ── Public routes: never block ──────────────────────────────
    if (pathname === '/admin/login') {
        return NextResponse.next();
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // ── Admin routes: require admin or superadmin ───────────────
    if (pathname.startsWith('/admin')) {
        if (!token || (token.role !== 'admin' && token.role !== 'superadmin')) {
            return NextResponse.redirect(new URL('/admin/login', req.url));
        }
    }

    // ── Client routes: require client role ──────────────────────
    if (pathname.startsWith('/mon-compte') || pathname.startsWith('/prets')) {
        if (!token || token.role !== 'client') {
            return NextResponse.redirect(new URL('/connexion', req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/mon-compte/:path*',
        '/prets/:path*',
        '/api/kyc/:path*',
        '/api/accounts/:path*',
        '/api/loans/:path*',
    ],
};
