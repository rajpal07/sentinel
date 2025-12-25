import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "painless-braden-parthenocarpic.ngrok-free.dev"
      ],
    },
  },
  reactCompiler: true,
};

export default nextConfig;
