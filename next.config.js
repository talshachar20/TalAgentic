/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure server-side code (Anthropic SDK) is not bundled for the browser
  serverExternalPackages: ["@anthropic-ai/sdk"],
};

module.exports = nextConfig;
