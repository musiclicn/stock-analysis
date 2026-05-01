import { SignJWT, jwtVerify } from 'jose';
import * as cookie from 'cookie';

const JWT_SECRET_STRING = "super-secret-local-jwt-key"; // Note: For production use env.JWT_SECRET

async function getJwtSecret(env, url) {
    let secret = env.JWT_SECRET;
    if (!secret) {
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            secret = JWT_SECRET_STRING;
        } else {
            throw new Error("JWT_SECRET is not set in production");
        }
    }
    return new TextEncoder().encode(secret);
}

// Convert ArrayBuffer to Hex String
function buf2hex(buffer) {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

// Legacy SHA-256 hash for backward compatibility
async function hashPasswordLegacy(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return buf2hex(hash);
}

// Hash password with Web Crypto API using PBKDF2
async function hashPassword(password, saltHex = null) {
    const encoder = new TextEncoder();
    const salt = saltHex ? new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))) : crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        256
    );
    const hashHex = buf2hex(derivedBits);
    if (!saltHex) {
        return `${buf2hex(salt)}:${hashHex}`;
    }
    return hashHex;
}

async function sha256Hex(str) {
    const data = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return buf2hex(hash);
}

function randomTokenBase64Url(byteLen = 32) {
    const bytes = crypto.getRandomValues(new Uint8Array(byteLen));
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Set HTTP-Only Cookie header
function serializeCookie(name, value, maxAge) {
    return `${name}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        console.log("FETCH", request.method, url.pathname);

        // API Routes
        if (url.pathname.startsWith('/api/auth/')) {
            const path = url.pathname.replace('/api/auth/', '');
            const method = request.method;

            // ---- Local Registration ----
            if (path === 'register' && method === 'POST') {
                try {
                    const { email, password } = await request.json();
                    if (!email || !password) return new Response("Email and password required", { status: 400 });

                    // Check if user exists
                    const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
                    if (existing) return new Response("User already exists", { status: 400 });

                    const userId = crypto.randomUUID();
                    const passwordHash = await hashPassword(password);

                    await env.DB.prepare(
                        "INSERT INTO users (id, email, password_hash, provider) VALUES (?, ?, ?, 'local')"
                    ).bind(userId, email, passwordHash).run();

                    return new Response(JSON.stringify({ success: true, message: "User registered" }), { status: 201 });
                } catch (e) {
                    return new Response(e.message, { status: 500 });
                }
            }

            // ---- Local Login ----
            if (path === 'login' && method === 'POST') {
                try {
                    const { email, password } = await request.json();
                    if (!email || !password) return new Response("Email and password required", { status: 400 });

                    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND provider = 'local'").bind(email).first();
                    if (!user) return new Response("Invalid credentials", { status: 401 });

                    let isValid = false;
                    let needsUpgrade = false;

                    if (user.password_hash && user.password_hash.includes(':')) {
                        const [saltHex, hashHex] = user.password_hash.split(':');
                        const computedHash = await hashPassword(password, saltHex);
                        if (computedHash === hashHex) {
                            isValid = true;
                        }
                    } else if (user.password_hash) {
                        // Legacy SHA-256 check
                        const computedHash = await hashPasswordLegacy(password);
                        if (computedHash === user.password_hash) {
                            isValid = true;
                            needsUpgrade = true;
                        }
                    }

                    if (!isValid) return new Response("Invalid credentials", { status: 401 });

                    if (needsUpgrade) {
                        const newHash = await hashPassword(password);
                        await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(newHash, user.id).run();
                    }

                    // Create JWT
                    const secret = await getJwtSecret(env, url);
                    const jwt = await new SignJWT({ userId: user.id, email: user.email })
                        .setProtectedHeader({ alg: 'HS256' })
                        .setIssuedAt()
                        .setExpirationTime('7d')
                        .sign(secret);

                    const response = new Response(JSON.stringify({ success: true, user: { id: user.id, email: user.email } }), { status: 200 });
                    response.headers.append('Set-Cookie', serializeCookie('auth_token', jwt, 7 * 24 * 60 * 60));
                    return response;
                } catch (e) {
                    return new Response(e.message, { status: 500 });
                }
            }

            // ---- Logout ----
            if (path === 'logout' && method === 'POST') {
                const response = new Response(JSON.stringify({ success: true }), { status: 200 });
                response.headers.append('Set-Cookie', serializeCookie('auth_token', '', 0)); // Expire cookie
                return response;
            }

            // ---- Forgot Password (request reset email) ----
            if (path === 'forgot-password' && method === 'POST') {
                try {
                    const { email } = await request.json();
                    if (!email) return new Response("Email required", { status: 400 });

                    if (!env.RESEND_API_KEY) {
                        return new Response(
                            "Password reset is not configured on this server. The RESEND_API_KEY secret is missing.",
                            { status: 500 }
                        );
                    }

                    // Always return the same response to prevent email enumeration
                    const okResponse = () => new Response(JSON.stringify({ success: true }), { status: 200 });

                    const user = await env.DB.prepare(
                        "SELECT id, email FROM users WHERE email = ? AND provider = 'local' AND password_hash IS NOT NULL"
                    ).bind(email).first();
                    if (!user) return okResponse();

                    const token = randomTokenBase64Url(32);
                    const tokenHash = await sha256Hex(token);
                    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour

                    // Invalidate any prior unused tokens for this user
                    await env.DB.prepare(
                        "DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL"
                    ).bind(user.id).run();

                    await env.DB.prepare(
                        "INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)"
                    ).bind(tokenHash, user.id, expiresAt).run();

                    const resetUrl = `${url.origin}/?reset=${encodeURIComponent(token)}`;
                    const fromEmail = env.FROM_EMAIL || 'onboarding@resend.dev';

                    const emailRes = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            from: fromEmail,
                            to: user.email,
                            subject: 'Reset your password',
                            text: `We received a request to reset your password. The link below is valid for 1 hour:\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
                            html: `<p>We received a request to reset your password. The link below is valid for 1 hour:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can safely ignore this email.</p>`
                        })
                    });

                    if (!emailRes.ok) {
                        const errBody = await emailRes.text();
                        console.error("Resend email send failed:", emailRes.status, errBody);
                    }

                    return okResponse();
                } catch (e) {
                    return new Response(e.message, { status: 500 });
                }
            }

            // ---- Reset Password (consume token) ----
            if (path === 'reset-password' && method === 'POST') {
                try {
                    const { token, password } = await request.json();
                    if (!token || !password) return new Response("Token and password required", { status: 400 });
                    if (password.length < 8) return new Response("Password must be at least 8 characters", { status: 400 });

                    const tokenHash = await sha256Hex(token);
                    const now = Math.floor(Date.now() / 1000);

                    const reset = await env.DB.prepare(
                        "SELECT user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?"
                    ).bind(tokenHash).first();

                    if (!reset || reset.used_at !== null || reset.expires_at < now) {
                        return new Response("Invalid or expired reset link", { status: 400 });
                    }

                    const passwordHash = await hashPassword(password);

                    await env.DB.batch([
                        env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(passwordHash, reset.user_id),
                        env.DB.prepare("UPDATE password_resets SET used_at = ? WHERE token_hash = ?").bind(now, tokenHash)
                    ]);

                    return new Response(JSON.stringify({ success: true }), { status: 200 });
                } catch (e) {
                    return new Response(e.message, { status: 500 });
                }
            }

            // ---- Get Current User (Session Check) ----
            if (path === 'me' && method === 'GET') {
                const cookieStr = request.headers.get('Cookie') || '';
                const match = cookieStr.match(/auth_token=([^;]+)/);
                if (!match) return new Response("Not authenticated", { status: 401 });

                try {
                    const secret = await getJwtSecret(env, url);
                    const { payload } = await jwtVerify(match[1], secret);
                    return new Response(JSON.stringify({ success: true, user: { id: payload.userId, email: payload.email } }), { status: 200 });
                } catch (e) {
                    return new Response("Invalid token", { status: 401 });
                }
            }

            // ---- Google OAuth Redirect ----
            if (path === 'google' && method === 'GET') {
                if (!env.GOOGLE_CLIENT_ID) {
                    return new Response(
                        "Google sign-in is not configured on this server. The GOOGLE_CLIENT_ID secret is missing. " +
                        "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET via `wrangler secret put` and ensure " +
                        `${url.origin}/api/auth/google/callback is registered as an authorized redirect URI in the Google Cloud Console.`,
                        { status: 500 }
                    );
                }
                const clientId = env.GOOGLE_CLIENT_ID;
                const redirectUri = `${url.origin}/api/auth/google/callback`;
                const state = crypto.randomUUID();
                const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile&state=${encodeURIComponent(state)}`;
                return new Response(null, {
                    status: 302,
                    headers: {
                        'Location': authUrl,
                        'Set-Cookie': serializeCookie('oauth_state', state, 60 * 10) // 10 minutes
                    }
                });
            }

            // ---- Google OAuth Callback ----
            if (path === 'google/callback' && method === 'GET') {
                const code = url.searchParams.get('code');
                const state = url.searchParams.get('state');
                const cookieStr = request.headers.get('Cookie') || '';
                const match = cookieStr.match(/oauth_state=([^;]+)/);
                if (!code) return new Response("No code provided", { status: 400 });
                if (!state || !match || state !== match[1]) {
                    return new Response("Invalid state parameter", { status: 400 });
                }

                if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
                    return new Response(
                        "Google sign-in is not configured on this server. GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET secrets are missing.",
                        { status: 500 }
                    );
                }
                const clientId = env.GOOGLE_CLIENT_ID;
                const clientSecret = env.GOOGLE_CLIENT_SECRET;
                const redirectUri = `${url.origin}/api/auth/google/callback`;

                try {
                    // Exchange code for token
                    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            code,
                            client_id: clientId,
                            client_secret: clientSecret,
                            redirect_uri: redirectUri,
                            grant_type: 'authorization_code'
                        })
                    });
                    const tokenData = await tokenRes.json();
                    if (!tokenData.access_token) throw new Error("Failed to get Google access token");

                    // Get user info
                    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
                    });
                    const userData = await userRes.json();
                    if (!userData.email) throw new Error("Failed to get Google user email");

                    // Handle user in DB
                    let user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(userData.email).first();
                    if (!user) {
                        const userId = crypto.randomUUID();
                        await env.DB.prepare(
                            "INSERT INTO users (id, email, provider, provider_id) VALUES (?, ?, 'google', ?)"
                        ).bind(userId, userData.email, userData.id).run();
                        user = { id: userId, email: userData.email };
                    }

                    // Create JWT
                    const secret = await getJwtSecret(env, url);
                    const jwt = await new SignJWT({ userId: user.id, email: user.email })
                        .setProtectedHeader({ alg: 'HS256' })
                        .setIssuedAt()
                        .setExpirationTime('7d')
                        .sign(secret);

                    // Redirect back to main site
                    return new Response(null, {
                        status: 302,
                        headers: {
                            'Location': url.origin,
                            'Set-Cookie': serializeCookie('auth_token', jwt, 7 * 24 * 60 * 60)
                        }
                    });

                } catch (e) {
                    return new Response(`Google Auth Error: ${e.message}`, { status: 500 });
                }
            }

            // ---- Facebook OAuth Redirect ----
            if (path === 'facebook' && method === 'GET') {
                if (!env.FACEBOOK_CLIENT_ID) {
                    return new Response(
                        "Facebook sign-in is not configured on this server. The FACEBOOK_CLIENT_ID secret is missing.",
                        { status: 500 }
                    );
                }
                const clientId = env.FACEBOOK_CLIENT_ID;
                const redirectUri = `${url.origin}/api/auth/facebook/callback`;
                const state = crypto.randomUUID();
                const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email&state=${encodeURIComponent(state)}`;
                return new Response(null, {
                    status: 302,
                    headers: {
                        'Location': authUrl,
                        'Set-Cookie': serializeCookie('oauth_state', state, 60 * 10) // 10 minutes
                    }
                });
            }

            // ---- Facebook OAuth Callback ----
            if (path === 'facebook/callback' && method === 'GET') {
                 const code = url.searchParams.get('code');
                 const state = url.searchParams.get('state');
                 const cookieStr = request.headers.get('Cookie') || '';
                 const match = cookieStr.match(/oauth_state=([^;]+)/);
                 if (!code) return new Response("No code provided", { status: 400 });
                 if (!state || !match || state !== match[1]) {
                     return new Response("Invalid state parameter", { status: 400 });
                 }

                 if (!env.FACEBOOK_CLIENT_ID || !env.FACEBOOK_CLIENT_SECRET) {
                     return new Response(
                         "Facebook sign-in is not configured on this server. FACEBOOK_CLIENT_ID/FACEBOOK_CLIENT_SECRET secrets are missing.",
                         { status: 500 }
                     );
                 }
                 const clientId = env.FACEBOOK_CLIENT_ID;
                 const clientSecret = env.FACEBOOK_CLIENT_SECRET;
                 const redirectUri = `${url.origin}/api/auth/facebook/callback`;

                 try {
                     // Exchange code for token
                     const tokenRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`);
                     const tokenData = await tokenRes.json();
                     if (!tokenData.access_token) throw new Error("Failed to get Facebook access token");

                     // Get user info
                     const userRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${tokenData.access_token}`);
                     const userData = await userRes.json();
                     if (!userData.email) throw new Error("Facebook did not return an email. The user might not have an email associated or denied the permission.");

                     // Handle user in DB
                     let user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(userData.email).first();
                     if (!user) {
                         const userId = crypto.randomUUID();
                         await env.DB.prepare(
                             "INSERT INTO users (id, email, provider, provider_id) VALUES (?, ?, 'facebook', ?)"
                         ).bind(userId, userData.email, userData.id).run();
                         user = { id: userId, email: userData.email };
                     }

                     // Create JWT
                     const secret = await getJwtSecret(env, url);
                     const jwt = await new SignJWT({ userId: user.id, email: user.email })
                         .setProtectedHeader({ alg: 'HS256' })
                         .setIssuedAt()
                         .setExpirationTime('7d')
                         .sign(secret);

                     // Redirect back to main site
                     return new Response(null, {
                         status: 302,
                         headers: {
                             'Location': url.origin,
                             'Set-Cookie': serializeCookie('auth_token', jwt, 7 * 24 * 60 * 60)
                         }
                     });

                 } catch (e) {
                     return new Response(`Facebook Auth Error: ${e.message}`, { status: 500 });
                 }
             }

            return new Response("Not found", { status: 404 });
        }

        // Serve static assets natively handled by Wrangler (fallback if not matched by assets)
        // With Cloudflare Workers `assets`, static files are intercepted *before* the script
        // if they match a file in the directory. If no file matches, it falls through to this script.
        return new Response("Not found", { status: 404 });
    }
};
