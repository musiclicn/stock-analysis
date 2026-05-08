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

    if (!env.FACEBOOK_CLIENT_ID || !env.FACEBOOK_CLIENT_SECRET) {
        throw createError({ statusCode: 500, statusMessage: "Facebook sign-in is not configured on this server. FACEBOOK_CLIENT_ID/FACEBOOK_CLIENT_SECRET secrets are missing." });
    }
    
    const clientId = env.FACEBOOK_CLIENT_ID;
    const clientSecret = env.FACEBOOK_CLIENT_SECRET;
    const redirectUri = `${url.origin}/api/auth/facebook/callback`;

    try {
        const tokenRes = await $fetch<any>(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`);
        if (!tokenRes.access_token) throw new Error("Failed to get Facebook access token");

        const userData = await $fetch<any>(`https://graph.facebook.com/me?fields=id,name,email&access_token=${tokenRes.access_token}`);
        if (!userData.email) throw new Error("Facebook did not return an email. The user might not have an email associated or denied the permission.");

        let user = await env.DB.prepare(
            "SELECT * FROM users WHERE email = ? AND provider = 'facebook'"
        ).bind(userData.email).first();
        
        if (!user) {
            const conflict = await env.DB.prepare(
                "SELECT id, provider FROM users WHERE email = ?"
            ).bind(userData.email).first();
            
            if (conflict) {
                if (conflict.provider === 'local') {
                    await env.DB.prepare(
                        "UPDATE users SET provider = 'facebook', provider_id = ?, password_hash = NULL WHERE id = ?"
                    ).bind(userData.id, conflict.id).run();
                    user = { id: conflict.id, email: userData.email };
                } else {
                    throw createError({ statusCode: 409, statusMessage: "An account with this email already exists. Please log in with your original sign-in method." });
                }
            } else {
                const userId = crypto.randomUUID();
                await env.DB.prepare(
                    "INSERT INTO users (id, email, provider, provider_id) VALUES (?, ?, 'facebook', ?)"
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
        throw createError({ statusCode: e.statusCode || 500, statusMessage: `Facebook Auth Error: ${e.statusMessage || e.message}` });
    }
});
