import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Sumsub WebSDK camera / mic in iframe
  async headers() {
    return [
      {
        source: "/dashboard/kyc",
        headers: [
          {
            key: "Permissions-Policy",
            value: 'camera=(self "https://api.sumsub.com"), microphone=(self "https://api.sumsub.com")',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
