import type { NextConfig } from 'next';

/**
 * Rate limiter untuk endpoint autentikasi (in-memory untuk dev; produksi dapat diganti Redis).
 */
const rateLimitKeyMap = new Map<string, number[]>();

const rateLimitMiddleware = async (identifier: string) => {
  const now = Date.now();
  const history = rateLimitKeyMap.get(identifier) || [];
  const recentHistory = history.filter(t => now - t < 5 * 60 * 1000);
  rateLimitKeyMap.set(identifier, [...recentHistory, now]);

  const remaining = 5 - recentHistory.length;
  if (remaining < 0) {
    return {
      status: 429,
      body: { error: { code: 'TOO_MANY_REQUESTS', message: 'Terlalu banyak percobaan login. Silakan tunggu 5 menit.' } },
    };
  }
  return null;
};

const nextConfig: NextConfig = {
  // Repositori ini berisi beberapa proyek; kunci root ke folder ini agar Next tidak
  // memakai lockfile di direktori induk.
  outputFileTracingRoot: process.cwd(),
  // Keamanan: header tambahan untuk produksi
  async headers() {
    return [
      // Header keamanan berlaku untuk semua rute
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' https:",
              "connect-src 'self' https://fonts.gstatic.com",
            ].join('; '),
          },
        ],
      },
      // Cookie Secure & SameSite untuk endpoint login (produksi)
      {
        source: '/login',
        headers: [
          {
            key: 'Set-Cookie',
            value: process.env.NODE_ENV === 'production' ? 'Secure; SameSite=Strict' : 'SameSite=Strict',
          },
        ],
      },
      {
        source: '/api/v1/auth/login',
        headers: [
          {
            key: 'Set-Cookie',
            value: process.env.NODE_ENV === 'production' ? 'Secure; SameSite=Strict' : 'SameSite=Strict',
          },
        ],
      },
    ];
  },
};

export default nextConfig;