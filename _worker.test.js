import { test } from 'node:test';
import assert from 'node:assert';
import { serializeCookie } from './serializeCookie.js';

test('serializeCookie', async (t) => {
    await t.test('should serialize a cookie with standard values', () => {
        const result = serializeCookie('auth_token', 'xyz123', 3600);
        assert.strictEqual(result, 'auth_token=xyz123; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600');
    });

    await t.test('should handle empty value', () => {
        const result = serializeCookie('auth_token', '', 0);
        assert.strictEqual(result, 'auth_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
    });

    await t.test('should handle different maxAge', () => {
        const result = serializeCookie('test', 'val', 86400);
        assert.strictEqual(result, 'test=val; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400');
    });

    await t.test('should handle special characters in name and value (simple pass-through)', () => {
        // Note: The current implementation is simple and doesn't URI encode.
        // This test documents the current behavior.
        const result = serializeCookie('complex;name', 'val=ue', 100);
        assert.strictEqual(result, 'complex;name=val=ue; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=100');
    });
});
