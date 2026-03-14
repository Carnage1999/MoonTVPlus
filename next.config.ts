import type { NextConfig } from 'next';

const isCloudflare =
  process.env.CF_PAGES === '1' || process.env.BUILD_TARGET === 'cloudflare';
const isPwaEnabled = process.env.ENABLE_PWA === '1';

const nextConfig: NextConfig = {
  output: isCloudflare ? undefined : 'standalone',
  eslint: {
    dirs: ['src'],
    ignoreDuringBuilds: true,
  },

  reactStrictMode: false,

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },

  webpack(config, { isServer }) {
    const fileLoaderRule = config.module.rules.find(
      (rule: { test?: { test?: (s: string) => boolean } }) =>
        rule.test?.test?.('.svg'),
    );

    config.module.rules.push(
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/,
      },
      {
        test: /\.svg$/i,
        issuer: { not: /\.(css|scss|sass)$/ },
        resourceQuery: { not: /url/ },
        loader: '@svgr/webpack',
        options: {
          dimensions: false,
          titleProp: true,
        },
      },
    );

    fileLoaderRule.exclude = /\.svg$/i;

    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      tls: false,
      crypto: false,
    };

    if (!isServer) {
      config.externals = config.externals || [];
      (config.externals as Array<Record<string, string>>).push({
        'better-sqlite3': 'commonjs better-sqlite3',
        '@vercel/postgres': 'commonjs @vercel/postgres',
        pg: 'commonjs pg',
      });

      config.resolve.alias = {
        ...config.resolve.alias,
        'better-sqlite3': false,
        '@/lib/d1.db': false,
        '@/lib/d1-adapter': false,
        '@/lib/postgres.db': false,
        '@/lib/postgres-adapter': false,
      };
    }

    return config;
  },
};

let exportedConfig: NextConfig = nextConfig;

if (isPwaEnabled) {
  // next-pwa is CJS-only, dynamic require needed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withPWA = require('next-pwa')({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true,
  });
  exportedConfig = withPWA(nextConfig);
}

export default exportedConfig;
