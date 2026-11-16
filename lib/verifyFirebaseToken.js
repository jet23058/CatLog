import { createPublicKey, createVerify } from 'node:crypto';

// 驗證 Firebase Auth ID token（RS256），不需要 service account。
// 參考：https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const CLOCK_SKEW_SECONDS = 60;

let certCache = { certs: null, expiresAt: 0 };

export class AuthError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthError';
    }
}

const base64UrlDecode = (value) => Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

const parseJsonSegment = (segment) => {
    try {
        return JSON.parse(base64UrlDecode(segment).toString('utf8'));
    } catch {
        throw new AuthError('登入憑證格式錯誤');
    }
};

const fetchCerts = async (fetchImpl) => {
    if (certCache.certs && Date.now() < certCache.expiresAt) return certCache.certs;
    const response = await fetchImpl(CERTS_URL);
    if (!response.ok) throw new Error(`無法取得驗證金鑰 (HTTP ${response.status})`);
    const certs = await response.json();
    const maxAge = Number(/max-age=(\d+)/.exec(response.headers?.get?.('cache-control') || '')?.[1]) || 3600;
    certCache = { certs, expiresAt: Date.now() + maxAge * 1000 };
    return certs;
};

export const resetCertCache = () => {
    certCache = { certs: null, expiresAt: 0 };
};

export const getBearerToken = (headers = {}) => {
    const raw = headers.authorization || headers.Authorization || '';
    const match = /^Bearer\s+(.+)$/i.exec(Array.isArray(raw) ? raw[0] : raw);
    return match ? match[1].trim() : '';
};

/**
 * 回傳 token payload（含 uid = sub）；驗證失敗丟出 AuthError。
 */
export const verifyFirebaseIdToken = async (token, {
    projectId,
    fetchImpl = fetch,
    now = () => Math.floor(Date.now() / 1000)
} = {}) => {
    if (!projectId) throw new Error('伺服器未設定 FIREBASE_PROJECT_ID');
    if (!token) throw new AuthError('缺少登入憑證');

    const parts = token.split('.');
    if (parts.length !== 3) throw new AuthError('登入憑證格式錯誤');
    const [headerSegment, payloadSegment, signatureSegment] = parts;
    const header = parseJsonSegment(headerSegment);
    const payload = parseJsonSegment(payloadSegment);

    if (header.alg !== 'RS256' || !header.kid) throw new AuthError('登入憑證演算法不符');

    const certs = await fetchCerts(fetchImpl);
    const cert = certs[header.kid];
    if (!cert) throw new AuthError('登入憑證金鑰不存在');

    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${headerSegment}.${payloadSegment}`);
    verifier.end();
    const isValid = verifier.verify(createPublicKey(cert), base64UrlDecode(signatureSegment));
    if (!isValid) throw new AuthError('登入憑證簽章無效');

    const currentTime = now();
    if (payload.aud !== projectId) throw new AuthError('登入憑證 audience 不符');
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new AuthError('登入憑證 issuer 不符');
    if (typeof payload.sub !== 'string' || !payload.sub) throw new AuthError('登入憑證缺少使用者');
    if (typeof payload.exp !== 'number' || payload.exp + CLOCK_SKEW_SECONDS < currentTime) throw new AuthError('登入憑證已過期');
    if (typeof payload.iat !== 'number' || payload.iat - CLOCK_SKEW_SECONDS > currentTime) throw new AuthError('登入憑證時間無效');

    return { ...payload, uid: payload.sub };
};
