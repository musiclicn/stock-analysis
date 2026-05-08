import { Resend } from 'resend';

export default defineEventHandler(async (event) => {
    const env = event.context.cloudflare.env;
    const ip = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1';

    if (isRateLimited(ip, 'register', 5, 15 * 60 * 1000)) {
        throw createError({ statusCode: 429, statusMessage: "Too many registration attempts. Try again later." });
    }
    
    try {
        const { email, password } = await readBody(event);
        if (!email || !password) throw createError({ statusCode: 400, statusMessage: "Email and password required" });
        if (password.length < 6) throw createError({ statusCode: 400, statusMessage: "Password must be at least 6 characters" });

        const okResponse = { success: true, message: "User registered" };

        const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
        if (existing) {
            if (env.RESEND_API_KEY) {
                event.context.cloudflare.context.waitUntil((async () => {
                    try {
                        let fromEmail = (env.FROM_EMAIL || 'onboarding@resend.dev').trim();
                        const url = new URL(getRequestURL(event));
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
                        await resend.emails.send({
                            from: fromEmail,
                            to: email,
                            subject: 'Registration Attempt',
                            text: "Hi,\n\nWe received a registration attempt for this email address. Since you already have an account, no action is required. If you forgot your password, you can reset it on the login page.\n\nThanks!",
                        });
                    } catch (e) {
                        console.error("Duplicate registration email failed:", e);
                    }
                })());
            }
            return okResponse;
        }

        const userId = crypto.randomUUID();
        const passwordHash = await hashPassword(password);

        await env.DB.prepare(
            "INSERT INTO users (id, email, password_hash, provider) VALUES (?, ?, ?, 'local')"
        ).bind(userId, email, passwordHash).run();

        return okResponse;
    } catch (e: any) {
        throw createError({ statusCode: 500, statusMessage: e.message });
    }
});
