// Set HTTP-Only Cookie header
export function serializeCookie(name, value, maxAge) {
    return `${name}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
