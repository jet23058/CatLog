import { generateKeyPairSync, createSign } from 'node:crypto';
import { beforeEach, describe, expect, test } from 'vitest';
import { AuthError, getBearerToken, resetCertCache, verifyFirebaseIdToken } from './verifyFirebaseToken.js';
import { createRateLimiter } from './rateLimit.js';

const projectId = 'catlog-test';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const { privateKey: otherKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicPem = publicKey.export({ type: 'spki', format: 'pem' });

const b64url = (value) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value))
    .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const NOW = 1_800_000_000;

const signToken = (overrides = {}, { key = privateKey, kid = 'kid-1' } = {}) => {
    const header = b64url({ alg: 'RS256', kid, typ: 'JWT' });
    const payload = b64url({
        aud: projectId,
        iss: `https://securetoken.google.com/${projectId}`,
        sub: 'user-123',
        iat: NOW - 10,
        exp: NOW + 3600,
        ...overrides
    });
    const signer = createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    const signature = signer.sign(key).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `${header}.${payload}.${signature}`;
};

const fetchImpl = async () => ({
    ok: true,
    headers: { get: () => 'public, max-age=3600' },
    json: async () => ({ 'kid-1': publicPem })
});

const verify = (token) => verifyFirebaseIdToken(token, { projectId, fetchImpl, now: () => NOW });

describe('verifyFirebaseIdToken', () => {
    beforeEach(() => resetCertCache());

    test('accepts a valid token', async () => {
        await expect(verify(signToken())).resolves.toMatchObject({ uid: 'user-123' });
    });

    test.each([
        ['wrong signer', () => signToken({}, { key: otherKey })],
        ['unknown key id', () => signToken({}, { kid: 'kid-x' })],
        ['wrong audience', () => signToken({ aud: 'other-project' })],
        ['wrong issuer', () => signToken({ iss: 'https://evil.example' })],
        ['expired', () => signToken({ exp: NOW - 3600 })],
        ['missing subject', () => signToken({ sub: '' })],
        ['malformed', () => 'not-a-jwt']
    ])('rejects %s', async (_name, makeToken) => {
        await expect(verify(makeToken())).rejects.toBeInstanceOf(AuthError);
    });

    test('rejects missing token and requires a project id', async () => {
        await expect(verify('')).rejects.toBeInstanceOf(AuthError);
        await expect(verifyFirebaseIdToken(signToken(), { projectId: '', fetchImpl })).rejects.toThrow('FIREBASE_PROJECT_ID');
    });

    test('reads bearer tokens from headers', () => {
        expect(getBearerToken({ authorization: 'Bearer abc.def.ghi' })).toBe('abc.def.ghi');
        expect(getBearerToken({})).toBe('');
    });
});

describe('createRateLimiter', () => {
    test('limits requests per key within a window', () => {
        let time = 0;
        const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => time });
        expect(limiter.take('a')).toBe(true);
        expect(limiter.take('a')).toBe(true);
        expect(limiter.take('a')).toBe(false);
        expect(limiter.take('b')).toBe(true);
        time = 1000;
        expect(limiter.take('a')).toBe(true);
    });
});
