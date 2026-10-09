import type { NextConfig } from "next"

// GitHub Pages can set NEXT_PUBLIC_BASE_PATH (for example, "/Brilliant-Chess").
// Vercel and local development should leave it unset so assets use root URLs.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || undefined

const nextConfig: NextConfig = {
  // This project is deployed as a static export for GitHub Pages.
  output: "export",
  ...(basePath
    ? {
        basePath,
        assetPrefix: `${basePath}/`,
      }
    : {}),
  distDir: "dist",
  images: {
    unoptimized: true,
  },
}

export default nextConfig
