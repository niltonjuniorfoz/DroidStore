/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://ajax.googleapis.com https://unpkg.com https://cdn.jsdelivr.net https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.mercadopago.com https://ajax.googleapis.com https://unpkg.com https://www.gstatic.com blob: data:; worker-src 'self' blob: https://www.gstatic.com; child-src 'self' blob:; frame-src 'self' https://www.gsmarena.com https://gsmarena.com https://sketchfab.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'" },
      ],
    }];
  },
};

export default nextConfig;
