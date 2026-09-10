import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';

// Stockage hybride : Vercel Blob si token présent, sinon stockage local ./fichier
// Permet de fonctionner en local sans BLOB_READ_WRITE_TOKEN et évite l'erreur 500 "Missing token"

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

function getLocalPath(key: string): string {
    // key = "userId/fileName"
    const safe = key.split('/').filter(s => s && !s.includes('..')).join('/');
    return path.join(process.cwd(), 'fichier', safe);
}

export async function saveFile(key: string, buffer: Buffer, contentType: string, access: 'private' | 'public' = 'private'): Promise<void> {
    if (BLOB_TOKEN) {
        try {
            const { put } = await import('@vercel/blob');
            await put(key, buffer, { access, contentType, addRandomSuffix: false });
            return;
        } catch (e) {
            console.warn('[FILE STORAGE] Vercel Blob put failed, fallback to local:', (e as any)?.message);
        }
    }
    const fullPath = getLocalPath(key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
}

export async function getFile(key: string): Promise<{ stream: ReadableStream | NodeJS.ReadableStream; contentType: string | null; blobFound: boolean } | null> {
    // 1. Essayer Vercel Blob si token
    if (BLOB_TOKEN) {
        try {
            const { get } = await import('@vercel/blob');
            const res = await get(key, { access: 'private' as any });
            if (res) {
                // res.stream est déjà un ReadableStream Web
                return { stream: res.stream as unknown as ReadableStream, contentType: (res as any).blob?.contentType || null, blobFound: true };
            }
        } catch (e) {
            // fallback local
        }
    }
    // 2. Fallback local
    const fullPath = getLocalPath(key);
    try {
        await fs.access(fullPath);
        // Pour NextResponse on peut créer un ReadableStream à partir du fichier
        // On retourne un Node stream, NextResponse l'accepte
        const nodeStream = createReadStream(fullPath);
        // Convertir en Web ReadableStream si nécessaire, mais NextResponse accepte Node stream via new Response
        return { stream: nodeStream as any, contentType: null, blobFound: false };
    } catch {
        return null;
    }
}

export function getLocalFilePath(key: string): string {
    return getLocalPath(key);
}
