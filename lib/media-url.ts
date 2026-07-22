// Pure string construction (no storage client needed — the public URL format
// is deterministic), so this is safe to call from both server and client code.

// Read from a client component (e.g. the lightbox), so this must be
// NEXT_PUBLIC_-prefixed — plain env vars are stripped from the browser bundle.
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

export function mediaPublicUrl(storagePath: string) {
  return `${R2_PUBLIC_URL}/${storagePath}`;
}

/**
 * R2 has no built-in image-resize endpoint (Supabase's Storage transform API
 * doesn't have an R2 equivalent without paid Cloudflare Image Resizing on a
 * custom domain), so thumbnails currently serve the original file. This
 * matches current production behavior — NEXT_PUBLIC_IMAGE_TRANSFORM has been
 * off there too — but is a known gap if the media library grows large.
 */
export function mediaThumbUrl(storagePath: string, _width: number) {
  return mediaPublicUrl(storagePath);
}
