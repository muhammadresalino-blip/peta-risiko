import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Repositori ini berisi beberapa proyek; kunci root ke folder ini agar Next tidak
  // memakai lockfile di direktori induk.
  outputFileTracingRoot: process.cwd(),
  // Keamanan: header tambahan untuk produksi
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    // Next.js menyisipkan script bootstrap inline; tanpa 'unsafe-inline' form
    // tidak ter-hidrasi. Mode dev juga memerlukan 'unsafe-eval' dan koneksi HMR.
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      `connect-src 'self' https://fonts.gstatic.com${isDev ? ' ws: wss:' : ''}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join('; ');

    return [
      // Header keamanan berlaku untuk semua rute
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
          ...(isDev
            ? []
            : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]),
        ],
      },
    ];
  },
};

export default nextConfig;