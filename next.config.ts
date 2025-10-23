import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Exclude Supabase Edge Functions from Next.js build (they're for Deno runtime)
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/supabase/functions/**',
      ],
    };
    return config;
  },
};

export default nextConfig;
