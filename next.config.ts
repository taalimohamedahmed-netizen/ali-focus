import type { NextConfig } from "next";

// Served from GitHub Pages at https://<user>.github.io/ali-focus/
// Static export — the whole app is client-side (Supabase from the browser).
const repo = "ali-focus";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? `/${repo}`,
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH ?? `/${repo}`,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
