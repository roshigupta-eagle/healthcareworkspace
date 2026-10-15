const nextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: true,
};

export default nextConfig;
