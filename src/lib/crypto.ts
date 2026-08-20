import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(): Buffer {
    const hexKey = process.env.FIELD_ENCRYPTION_KEY;
    if (!hexKey || hexKey.length !== 64) {
        throw new Error('FIELD_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    return Buffer.from(hexKey, 'hex');
}

/**
 * Encrypt a string value (for sensitive fields like nationalIdNumber)
 * Returns: base64-encoded "iv:tag:ciphertext"
 */
export function encrypt(plaintext: string): string {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypt a previously encrypted value
 */
export function decrypt(encryptedBase64: string): string {
    const key = getKey();
    const data = Buffer.from(encryptedBase64, 'base64');

    const iv = data.subarray(0, IV_LENGTH);
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
}

/**
 * Hash a password using SHA-256 (for admin 2FA secrets, not passwords - use argon2 for passwords)
 */
export function hashSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
}

/**
 * Generate a random token for email verification etc.
 */
export function generateToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
}
