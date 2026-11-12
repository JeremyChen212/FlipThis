/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    // Loops never change between deploys of the same file name; let browsers cache them.
    return [{ source: '/audio/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }] }];
  },
};
export default nextConfig;
