import { jwtVerify } from 'jose';

export default defineEventHandler(async (event) => {
    const env = event.context.cloudflare.env;
    const cookieStr = getRequestHeader(event, 'Cookie') || '';
    const match = cookieStr.match(/auth_token=([^;]+)/);
    
    if (match) {
        try {
            const { payload } = await jwtVerify(match[1], await getJwtSecret(env));
            if (payload.jti && payload.exp) {
                await env.DB.prepare("INSERT OR IGNORE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)").bind(payload.jti, payload.exp).run();
            }
        } catch (e) {
            // ignore invalid token on logout
        }
    }
    
    deleteCookie(event, 'auth_token');
    return { success: true };
});
