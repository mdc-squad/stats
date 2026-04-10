/** @type {import('next').NextConfig} */
const isStaticExport = process.env.STATIC_EXPORT === "true"
const inferredRepositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? ""
const inferredBasePath = inferredRepositoryName ? `/${inferredRepositoryName}` : ""
const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (isStaticExport ? inferredBasePath : "")
const normalizedBasePath =
  configuredBasePath === "/" ? "" : configuredBasePath.endsWith("/") ? configuredBasePath.slice(0, -1) : configuredBasePath
const rawAppBuildId =
  process.env.NEXT_PUBLIC_APP_BUILD_ID ??
  process.env.GITHUB_SHA ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_RUN_ID ??
  process.env.npm_package_version ??
  "dev"
const normalizedAppBuildId = String(rawAppBuildId).trim().slice(0, 12) || "dev"

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: normalizedBasePath,
    NEXT_PUBLIC_APP_BUILD_ID: normalizedAppBuildId,
  },
  ...(isStaticExport
    ? {
        output: "export",
        trailingSlash: true,
        basePath: normalizedBasePath,
        assetPrefix: normalizedBasePath || undefined,
      }
    : {}),
}

export default nextConfig
