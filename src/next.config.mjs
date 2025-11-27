/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
        return [
          // 排除 /api/example 路由，让 Next.js API Routes 处理
          {
            source: '/api/documents/:path*',
            destination: `${backendUrl}/api/documents/:path*`,
          },
          {
            source: '/api/translate/:path*',
            destination: `${backendUrl}/api/translate/:path*`,
          },
          {
            source: '/api/settings/:path*',
            destination: `${backendUrl}/api/settings/:path*`,
          },
          {
            source: '/ws/:path*',
            destination: `${backendUrl}/ws/:path*`,
          },
        ]
      },
};

export default nextConfig;
