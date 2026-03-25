const path = require("path");

/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "export",
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@inicie/shared-contracts": path.resolve(
        __dirname,
        "../../../packages/shared-contracts/src"
      )
    };
    return config;
  }
};

module.exports = nextConfig;
