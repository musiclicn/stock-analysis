export default defineEventHandler(async (event) => {
    const env = event.context.cloudflare.env;

    try {
        const { token, password } = await readBody(event);
        if (!token || !password) throw createError({ statusCode: 400, statusMessage: "Token and password required" });
        if (password.length < 6) throw createError({ statusCode: 400, statusMessage: "Password must be at least 6 characters" });

        const tokenHash = await sha256Hex(token);
        const now = Math.floor(Date.now() / 1000);

        const reset = await env.DB.prepare(
            "SELECT user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?"
        ).bind(tokenHash).first();

        if (!reset || reset.used_at !== null || reset.expires_at < now) {
            throw createError({ statusCode: 400, statusMessage: "Invalid or expired reset link" });
        }

        const passwordHash = await hashPassword(password);

        await env.DB.batch([
            env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(passwordHash, reset.user_id),
            env.DB.prepare("UPDATE password_resets SET used_at = ? WHERE token_hash = ?").bind(now, tokenHash)
        ]);

        return { success: true };
    } catch (e: any) {
        throw createError({ statusCode: e.statusCode || 500, statusMessage: e.statusMessage || e.message });
    }
});
