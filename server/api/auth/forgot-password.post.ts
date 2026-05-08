import { Resend } from 'resend';

export default defineEventHandler(async (event) => {
    const env = event.context.cloudflare.env;
    const ip = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1';

    if (isRateLimited(ip, 'forgot-password', 3, 15 * 60 * 1000)) {
        throw createError({ statusCode: 429, statusMessage: "Too many password reset requests. Try again later." });
    }
    try {
        const { email } = await readBody(event);
        if (!email) throw createError({ statusCode: 400, statusMessage: "Email required" });

        if (!env.RESEND_API_KEY) {
            throw createError({ statusCode: 500, statusMessage: "Password reset is not configured on this server. The RESEND_API_KEY secret is missing." });
        }

        const okResponse = { success: true };

        const user = await env.DB.prepare(
            "SELECT id, email FROM users WHERE email = ? AND provider = 'local' AND password_hash IS NOT NULL"
        ).bind(email).first();
        if (!user) return okResponse;

        const token = randomTokenBase64Url(32);
        const tokenHash = await sha256Hex(token);
        const expiresAt = Math.floor(Date.now() / 1000) + 3600;

        await env.DB.prepare(
            "DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL"
        ).bind(user.id).run();

        await env.DB.prepare(
            "INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)"
        ).bind(tokenHash, user.id, expiresAt).run();

        const url = new URL(getRequestURL(event));
        const resetUrl = `${url.origin}/?reset=${encodeURIComponent(token)}`;

        let fromEmail = (env.FROM_EMAIL || 'onboarding@resend.dev').trim();
        if (!fromEmail.includes('@')) {
            const domain = url.hostname.replace(/^www\./, '') || 'example.com';
            fromEmail = `${fromEmail} <noreply@${domain}>`;
        } else if (!fromEmail.includes('<') && fromEmail.includes(' ')) {
            const parts = fromEmail.split(/\s+/);
            const emailPart = parts.pop();
            const namePart = parts.join(' ');
            if (emailPart!.includes('@')) {
                fromEmail = `${namePart} <${emailPart}>`;
            }
        }

        const resend = new Resend(env.RESEND_API_KEY);
        const { error } = await resend.emails.send({
            from: fromEmail,
            to: user.email,
            subject: 'Reset your password',
            text: `We received a request to reset your password. The link below is valid for 1 hour:\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
            html: `<p>We received a request to reset your password. The link below is valid for 1 hour:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can safely ignore this email.</p>`
        });

        if (error) {
            console.error("Resend email send failed:", error);
        }

        return okResponse;
    } catch (e: any) {
        throw createError({ statusCode: e.statusCode || 500, statusMessage: e.statusMessage || e.message });
    }
});
