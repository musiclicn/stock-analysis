import { SignJWT } from 'jose';

export default defineEventHandler(async (event) => {
    const env = event.context.cloudflare.env;
    const ip = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1';

    if (isRateLimited(ip, 'login', 10, 5 * 60 * 1000)) {
        throw createError({ statusCode: 429, statusMessage: "Too many login attempts. Try again later." });
    }
    
    try {
        const { email, password } = await readBody(event);
        if (!email || !password) throw createError({ statusCode: 400, statusMessage: "Email and password required" });

        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND provider = 'local'").bind(email).first();
        if (!user) throw createError({ statusCode: 401, statusMessage: "Invalid credentials" });

        let isValid = false;
        let needsUpgrade = false;

        if (user.password_hash && user.password_hash.includes(':')) {
            const [saltHex, hashHex] = user.password_hash.split(':');
            const computedHash = await hashPassword(password, saltHex);
            if (computedHash === hashHex) {
                isValid = true;
            }
        } else if (user.password_hash) {
            const computedHash = await hashPasswordLegacy(password);
            if (computedHash === user.password_hash) {
                isValid = true;
                needsUpgrade = true;
            }
        }

        if (!isValid) throw createError({ statusCode: 401, statusMessage: "Invalid credentials" });

        if (needsUpgrade) {
            const newHash = await hashPassword(password);
            await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(newHash, user.id).run();
        }

        const secret = await getJwtSecret(env);
        const jti = crypto.randomUUID();
        const jwt = await new SignJWT({ userId: user.id, email: user.email, jti })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(secret);

        setCookie(event, 'auth_token', jwt, { maxAge: 7 * 24 * 60 * 60, path: '/', secure: true, httpOnly: true });
        
        return { success: true, user: { id: user.id, email: user.email } };
    } catch (e: any) {
        throw createError({ statusCode: e.statusCode || 500, statusMessage: e.statusMessage || e.message });
    }
});
