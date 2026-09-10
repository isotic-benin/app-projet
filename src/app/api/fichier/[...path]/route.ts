import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getFile } from '@/lib/file-storage';
import { extname } from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME_TYPES: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
};

export async function GET(
    req: Request,
    { params }: { params: { path: string[] } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const segments = params.path;

        if (!segments || segments.length < 2 || segments.some(s => s.includes('..'))) {
            return NextResponse.json({ error: 'Chemin invalide' }, { status: 400 });
        }

        const isAdmin = session.user.role === 'admin' || session.user.role === 'superadmin';
        const isOwner = session.user.id === segments[0];

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
        }

        const prefix = segments.join('/');

        const fileResult = await getFile(prefix);
        if (!fileResult) {
            return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 });
        }

        const ext = extname(prefix).toLowerCase();
        const resolvedContentType = fileResult.contentType || MIME_TYPES[ext] || 'application/octet-stream';

        let body: any = fileResult.stream;
        if (Buffer.isBuffer(body)) {
            // déjà un Buffer (MongoDB fallback)
        } else if (typeof (body as any).pipe === 'function') {
            const chunks: Buffer[] = [];
            for await (const chunk of body as any) chunks.push(Buffer.from(chunk));
            body = Buffer.concat(chunks);
        } else if (body instanceof ReadableStream) {
            // Web ReadableStream → on le passe tel quel à NextResponse
        }

        return new NextResponse(body, {
            status: 200,
            headers: {
                'Content-Type': resolvedContentType,
                'Cache-Control': 'private, max-age=3600',
                'Content-Disposition': `inline; filename="${segments[segments.length - 1]}"`,
            },
        });
    } catch (err) {
        console.error('[FILE SERVE ERROR]', err);
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
    }
}
