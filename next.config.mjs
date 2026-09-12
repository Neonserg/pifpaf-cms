/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Vercel Image Optimization is metered (the Hobby plan allows a few
    // thousand transformations a month). A single gallery page here holds
    // 100+ photos, each requested in several widths and formats, so the quota
    // ran out within days and Vercel then answered every /_next/image request
    // with 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED — no photo on the
    // public site loaded at all. `unoptimized` makes next/image render a plain
    // <img> pointing straight at R2 (originals, as before the next/image
    // switch), bypassing the metered optimizer entirely.
    unoptimized: true,
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
