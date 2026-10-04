import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  // reactStrictMode: false,
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH + "/",
  distDir: "dist",
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: `${process.env.NEXT_PUBLIC_BASE_PATH}/(.*)`,
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
      {
        source: `${process.env.NEXT_PUBLIC_BASE_PATH}/engine/(.*)`,
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ]
  }
}

export default nextConfig