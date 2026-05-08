import { SignJWT, jwtVerify } from 'jose';

export async function getJwtSecret(env: any) {
    if (!env.JWT_SECRET) {
        throw new Error("JWT_SECRET environment secret is not configured. Run: wrangler secret put JWT_SECRET");
    }
    return new TextEncoder().encode(env.JWT_SECRET);
}

export function buf2hex(buffer: ArrayBuffer) {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

export async function hashPasswordLegacy(password: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return buf2hex(hash);
}

export async function hashPassword(password: string, saltHex: string | null = null) {
    const encoder = new TextEncoder();
    const salt = saltHex ? new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))) : crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        256
    );
    const hashHex = buf2hex(derivedBits);
    if (!saltHex) {
        return `${buf2hex(salt)}:${hashHex}`;
    }
    return hashHex;
}

export async function sha256Hex(str: string) {
    const data = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return buf2hex(hash);
}

export function randomTokenBase64Url(byteLen = 32) {
    const bytes = crypto.getRandomValues(new Uint8Array(byteLen));
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const rateLimitMap = new Map();

export function isRateLimited(ip: string | null, action: string, limit: number, windowMs: number) {
    if (!ip) return false;
    const now = Date.now();
    const key = `${ip}:${action}`;
    
    if (rateLimitMap.size > 10000) {
        rateLimitMap.clear();
    }

    const record = rateLimitMap.get(key);
    if (!record) {
        rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
        return false;
    }

    if (now > record.resetAt) {
        record.count = 1;
        record.resetAt = now + windowMs;
        return false;
    }

    record.count += 1;
    return record.count > limit;
}

export async function verifyAuthToken(token: string, env: any) {
    const secret = await getJwtSecret(env);
    const result = await jwtVerify(token, secret);
    if (result.payload.jti) {
        const revoked = await env.DB.prepare("SELECT jti FROM revoked_tokens WHERE jti = ?").bind(result.payload.jti).first();
        if (revoked) throw new Error("Token revoked");
    }
    return result;
}
