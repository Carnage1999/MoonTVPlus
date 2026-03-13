/** @type {import('next').NextConfig} */
/* eslint-disable @typescript-eslint/no-var-requires */

const isCloudflare =
  process.env.CF_PAGES === '1' || process.env.BUILD_TARGET === 'cloudflare';
const isPwaEnabled = process.env.ENABLE_PWA === '1';

const nextConfig = {
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
    const fileLoaderRule = config.module.rules.find((rule) =>
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
      config.externals.push({
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

if (!isPwaEnabled) {
  module.exports = nextConfig;
} else {
  const withPWA = require('next-pwa')({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true,
  });

  module.exports = withPWA(nextConfig);
}
