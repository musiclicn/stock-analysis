export default defineEventHandler(async (event) => {
    const env = event.context.cloudflare.env;
    const url = new URL(getRequestURL(event));

    if (!env.FACEBOOK_CLIENT_ID) {
        throw createError({
            statusCode: 500,
            statusMessage: "Facebook sign-in is not configured on this server. The FACEBOOK_CLIENT_ID secret is missing."
        });
    }

    const clientId = env.FACEBOOK_CLIENT_ID;
    const redirectUri = `${url.origin}/api/auth/facebook/callback`;
    const state = crypto.randomUUID();
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email&state=${encodeURIComponent(state)}`;
    
    setCookie(event, 'oauth_state', state, { maxAge: 60 * 10, path: '/' }); // 10 minutes
    
    return sendRedirect(event, authUrl, 302);
});
