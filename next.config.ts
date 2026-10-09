import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: process.env.FRONTEND_DEV_HOST
    ? [process.env.FRONTEND_DEV_HOST]
    : [],
};

export default nextConfig;
