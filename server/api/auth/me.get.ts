export default defineEventHandler(async (event) => {
    const env = event.context.cloudflare.env;
    const cookieStr = getRequestHeader(event, 'Cookie') || '';
    const match = cookieStr.match(/auth_token=([^;]+)/);
    
    if (!match) throw createError({ statusCode: 401, statusMessage: "Not authenticated" });

    try {
        const { payload } = await verifyAuthToken(match[1], env);

        // Fetch is_admin status
        const dbUser = await env.DB.prepare("SELECT is_admin FROM users WHERE id = ?").bind(payload.userId).first();
        const is_admin = dbUser ? !!dbUser.is_admin : false;

        return { success: true, user: { id: payload.userId, email: payload.email, is_admin } };
    } catch (e) {
        throw createError({ statusCode: 401, statusMessage: "Invalid token" });
    }
});
