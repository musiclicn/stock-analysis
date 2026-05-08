export default defineEventHandler(async (event) => {
    const env = event.context.cloudflare.env;
    const url = new URL(getRequestURL(event));

    if (!env.GOOGLE_CLIENT_ID) {
        throw createError({
            statusCode: 500,
            statusMessage: "Google sign-in is not configured on this server. The GOOGLE_CLIENT_ID secret is missing. " +
            "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET via `wrangler secret put` and ensure " +
            `${url.origin}/api/auth/google/callback is registered as an authorized redirect URI in the Google Cloud Console.`
        });
    }

    const clientId = env.GOOGLE_CLIENT_ID;
    const redirectUri = `${url.origin}/api/auth/google/callback`;
    const state = crypto.randomUUID();
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile&state=${encodeURIComponent(state)}`;
    
    setCookie(event, 'oauth_state', state, { maxAge: 60 * 10, path: '/' }); // 10 minutes
    
    return sendRedirect(event, authUrl, 302);
});
