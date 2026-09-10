import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

function getLocalPath(key: string): string {
    const safe = key.split('/').filter(s => s && !s.includes('..')).join('/');
    // Vercel : seul /tmp est inscriptible. En prod sans Blob, on écrit dans /tmp
    const base = process.env.VERCEL ? '/tmp' : process.cwd();
    return path.join(base, 'fichier', safe);
}

export async function saveFile(key: string, buffer: Buffer, contentType: string, access: 'private' | 'public' = 'private'): Promise<void> {
    // 1. Vercel Blob si token présent
    if (BLOB_TOKEN) {
        try {
            const { put } = await import('@vercel/blob');
            await put(key, buffer, { access, contentType, addRandomSuffix: false });
            return;
        } catch (e) {
            console.warn('[FILE STORAGE] Vercel Blob put failed, fallback:', (e as any)?.message);
        }
    }
    // 2. Local /tmp / fichier
    try {
        const fullPath = getLocalPath(key);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, buffer);
        return;
    } catch (e: any) {
        console.warn('[FILE STORAGE] Local write failed, fallback to MongoDB:', e?.message);
    }
    // 3. Fallback MongoDB (persitant, fonctionne sur Vercel sans token)
    try {
        const { getDb } = await import('./db');
        const db = await getDb();
        await db.collection('files').updateOne(
            { key },
            { $set: { key, buffer, contentType, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
            { upsert: true }
        );
        return;
    } catch (e) {
        console.error('[FILE STORAGE] MongoDB fallback failed:', e);
        throw e;
    }
}

export async function getFile(key: string): Promise<{ stream: ReadableStream | NodeJS.ReadableStream | Buffer; contentType: string | null; blobFound: boolean } | null> {
    if (BLOB_TOKEN) {
        try {
            const { get } = await import('@vercel/blob');
            const res = await get(key, { access: 'private' as any });
            if (res) {
                return { stream: res.stream as unknown as ReadableStream, contentType: (res as any).blob?.contentType || null, blobFound: true };
            }
        } catch {}
    }
    // Local
    const fullPath = getLocalPath(key);
    try {
        await fs.access(fullPath);
        const nodeStream = createReadStream(fullPath);
        return { stream: nodeStream as any, contentType: null, blobFound: false };
    } catch {}
    // MongoDB fallback
    try {
        const { getDb } = await import('./db');
        const db = await getDb();
        const doc = await db.collection('files').findOne({ key }) as any;
        if (doc?.buffer) {
            const buf: Buffer = Buffer.isBuffer(doc.buffer) ? doc.buffer : Buffer.from(doc.buffer.buffer || doc.buffer);
            // Retourner Buffer directement, le handler le convertira
            return { stream: buf as any, contentType: doc.contentType || null, blobFound: false };
        }
    } catch {}
    return null;
}

export function getLocalFilePath(key: string): string {
    return getLocalPath(key);
}
