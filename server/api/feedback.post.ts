export default defineEventHandler(async (event) => {
    const env = event.context.cloudflare.env;
    const ip = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1';

    if (isRateLimited(ip, 'feedback', 5, 60 * 1000)) {
        throw createError({ statusCode: 429, statusMessage: "Too many requests, please try again later." });
    }
    
    try {
        const { type, message, username } = await readBody(event);
        
        if (!message || typeof message !== 'string') throw createError({ statusCode: 400, statusMessage: "Message required" });
        if (message.length > 1000) throw createError({ statusCode: 400, statusMessage: "Message exceeds maximum length of 1000 characters" });
        if (type && (typeof type !== 'string' || type.length > 50)) throw createError({ statusCode: 400, statusMessage: "Type invalid or too long (max 50 chars)" });
        if (username && (typeof username !== 'string' || username.length > 100)) throw createError({ statusCode: 400, statusMessage: "Username invalid or too long (max 100 chars)" });

        let userId = null;
        const cookieStr = getRequestHeader(event, 'Cookie') || '';
        const match = cookieStr.match(/auth_token=([^;]+)/);

        if (match) {
            try {
                const { payload } = await verifyAuthToken(match[1], env);
                userId = payload.userId;
            } catch (e) {
                // ignore invalid token for anonymous feedback
            }
        }

        const id = crypto.randomUUID();
        await env.DB.prepare(
            "INSERT INTO feedbacks (id, user_id, username, type, message) VALUES (?, ?, ?, ?, ?)"
        ).bind(id, userId, username || null, type || 'other', message).run();

        return { success: true, message: "Feedback submitted" };
    } catch (e: any) {
        throw createError({ statusCode: e.statusCode || 500, statusMessage: e.statusMessage || e.message });
    }
});
