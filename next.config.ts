import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Camera / mic for chat capture + Sumsub KYC iframe
  async headers() {
    return [
      {
        source: "/dashboard/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value:
              'camera=(self "https://api.sumsub.com"), microphone=(self "https://api.sumsub.com")',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
