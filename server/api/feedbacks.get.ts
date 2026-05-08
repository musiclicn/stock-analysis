export default defineEventHandler(async (event) => {
    const env = event.context.cloudflare.env;
    const cookieStr = getRequestHeader(event, 'Cookie') || '';
    const match = cookieStr.match(/auth_token=([^;]+)/);
    
    if (!match) {
        throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
    }

    try {
        const { payload } = await verifyAuthToken(match[1], env);

        const dbUser = await env.DB.prepare("SELECT is_admin FROM users WHERE id = ?").bind(payload.userId).first();
        if (!dbUser || !dbUser.is_admin) {
            throw createError({ statusCode: 403, statusMessage: "Forbidden" });
        }

        const { results } = await env.DB.prepare("SELECT * FROM feedbacks ORDER BY created_at DESC").all();
        return { success: true, feedbacks: results };
    } catch (e: any) {
        throw createError({ statusCode: 500, statusMessage: e.message });
    }
});
