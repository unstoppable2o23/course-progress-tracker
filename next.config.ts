import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs"],
  serverActions: {
    bodySizeLimit: "10mb",
  },
};

export default nextConfig;
