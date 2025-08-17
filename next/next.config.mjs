/** @type {import('next').NextConfig} */

const nextConfig = {
  serverExternalPackages: ['mysql2'],
  images: {
    remotePatterns: [ new URL(`${process.env.NEXT_PUBLIC_HOST_URL}/*`) ],
  },
};

export default nextConfig;

