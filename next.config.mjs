// Static export => deployable on GitHub Pages / Cloudflare Pages / Vercel / Netlify.
// For a GitHub *project* page set NEXT_PUBLIC_BASE_PATH=/your-repo-name at build time.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};
export default nextConfig;
