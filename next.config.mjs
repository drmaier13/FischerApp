/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig = {
  poweredByHeader: false,
  output: isStaticExport ? "export" : "standalone",
  ...(isStaticExport ? { trailingSlash: true } : {}),
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
