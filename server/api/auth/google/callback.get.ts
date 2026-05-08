import { SignJWT } from 'jose';

export default defineEventHandler(async (event) => {
    const env = event.context.cloudflare.env;
    const url = new URL(getRequestURL(event));
    const query = getQuery(event);
    
    const code = query.code as string;
    const state = query.state as string;
    const cookieStr = getRequestHeader(event, 'Cookie') || '';
    const match = cookieStr.match(/oauth_state=([^;]+)/);
    
    if (!code) throw createError({ statusCode: 400, statusMessage: "No code provided" });
    if (!state || !match || state !== match[1]) {
        throw createError({ statusCode: 400, statusMessage: "Invalid state parameter" });
    }

    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        throw createError({ statusCode: 500, statusMessage: "Google sign-in is not configured on this server. GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET secrets are missing." });
    }
    
    const clientId = env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${url.origin}/api/auth/google/callback`;

    try {
        const tokenRes = await $fetch<any>('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            }).toString()
        });
        
        if (!tokenRes.access_token) throw new Error("Failed to get Google access token");

        const userData = await $fetch<any>('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${tokenRes.access_token}` }
        });
        
        if (!userData.email) throw new Error("Failed to get Google user email");

        let user = await env.DB.prepare(
            "SELECT * FROM users WHERE email = ? AND provider = 'google'"
        ).bind(userData.email).first();
        
        if (!user) {
            const conflict = await env.DB.prepare(
                "SELECT id, provider FROM users WHERE email = ?"
            ).bind(userData.email).first();
            
            if (conflict) {
                if (conflict.provider === 'local') {
                    await env.DB.prepare(
                        "UPDATE users SET provider = 'google', provider_id = ?, password_hash = NULL WHERE id = ?"
                    ).bind(userData.id, conflict.id).run();
                    user = { id: conflict.id, email: userData.email };
                } else {
                    throw createError({ statusCode: 409, statusMessage: "An account with this email already exists. Please log in with your original sign-in method." });
                }
            } else {
                const userId = crypto.randomUUID();
                await env.DB.prepare(
                    "INSERT INTO users (id, email, provider, provider_id) VALUES (?, ?, 'google', ?)"
                ).bind(userId, userData.email, userData.id).run();
                user = { id: userId, email: userData.email };
            }
        }

        const secret = await getJwtSecret(env);
        const jti = crypto.randomUUID();
        const jwt = await new SignJWT({ userId: user.id, email: user.email, jti })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(secret);

        setCookie(event, 'auth_token', jwt, { maxAge: 7 * 24 * 60 * 60, path: '/', secure: true, httpOnly: true });
        
        return sendRedirect(event, url.origin, 302);
    } catch (e: any) {
        throw createError({ statusCode: e.statusCode || 500, statusMessage: `Google Auth Error: ${e.statusMessage || e.message}` });
    }
});
