import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE === "true" ? { output: "standalone" } : {}),
  ...(process.env.NEXT_EXPORT === "true" ? { output: "export", images: { unoptimized: true } } : {}),
};

export default nextConfig;
