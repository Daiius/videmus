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
};

export default nextConfig;

