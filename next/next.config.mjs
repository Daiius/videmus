/** @type {import('next').NextConfig} */
import path from 'path';

const nextConfig = {
  basePath: '/videmus',
  //publicRuntimeConfig: {
  //  basePath: '/videmus',
  //},
  output: 'standalone',
  //outputFileTracingRoot: path.join(path.resolve(), '../'),
  //webpack: (config) => ({
  //  ...config,
  //  optimization: { minimize: false },
  //}),
  serverExternalPackages: ['mysql2'],
};

export default nextConfig;

