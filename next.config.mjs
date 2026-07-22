/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pub-9e306cc4beb44cb8a34af75815e09b58.r2.dev" },
      // Legacy: settings.logo_light_url/logo_dark_url/favicon_url/og_image_url
      // still hold absolute Supabase URLs from before the Neon/R2 migration.
      { protocol: "https", hostname: "uncpsomdrijhosgrdgwr.supabase.co" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // The site is never meant to be embedded in an iframe (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
