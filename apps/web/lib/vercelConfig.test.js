import { describe, expect, it } from 'vitest';
import config from '../vercel.json';

// Vercel 的 source 是 path-to-regexp；這裡只用到 (…) 與負向前瞻，轉成一般 RegExp 檢查。
const matches = (source, path) => new RegExp(`^${source}$`).test(path);

describe('vercel.json：Google 登入用自己的網域', () => {
  it('把 /__/auth 與 /__/firebase 轉送到正式站 Firebase', () => {
    const rewrites = Object.fromEntries(config.rewrites.map((r) => [r.source, r.destination]));
    expect(rewrites['/__/auth/:path*']).toBe('https://asset-prod.firebaseapp.com/__/auth/:path*');
    expect(rewrites['/__/firebase/:path*']).toBe('https://asset-prod.firebaseapp.com/__/firebase/:path*');
  });

  it('安全標頭（X-Frame-Options: DENY）不套用在登入頁，否則登入用的 iframe 會被擋', () => {
    const security = config.headers.find((h) => h.headers.some((x) => x.key === 'X-Frame-Options'));
    expect(matches(security.source, '/__/auth/iframe')).toBe(false);
    expect(matches(security.source, '/__/auth/handler')).toBe(false);
    expect(matches(security.source, '/__/firebase/init.json')).toBe(false);
  });

  it('其他頁面照樣有安全標頭', () => {
    const security = config.headers.find((h) => h.headers.some((x) => x.key === 'X-Frame-Options'));
    for (const path of ['/', '/index.html', '/assets/index-abc.js', '/api/stock-quote']) {
      expect(matches(security.source, path)).toBe(true);
    }
  });
});
