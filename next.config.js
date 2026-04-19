/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure server-side code (Anthropic SDK) is not bundled for the browser
  serverExternalPackages: ["@anthropic-ai/sdk"],
  // Produce a self-contained build in .next/standalone — required for Docker
  output: "standalone",
};

module.exports = nextConfig;
