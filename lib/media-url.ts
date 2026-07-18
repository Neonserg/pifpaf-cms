// Pure string construction (no Supabase client needed — the public URL format
// is deterministic), so this is safe to call from both server and client code.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Supabase image transformations are opt-in: enabling them changes the live
// site's image URLs, so we gate the resized variant behind an env flag. With
// the flag off (default), thumbnails fall back to the original object URL and
// nothing about production behavior changes.
const IMAGE_TRANSFORM = process.env.NEXT_PUBLIC_IMAGE_TRANSFORM === "on";

export function mediaPublicUrl(storagePath: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/media/${storagePath}`;
}

/**
 * Resized/optimized URL for grid thumbnails, so a photo portfolio isn't shipping
 * full-resolution originals into small tiles. Requires Supabase image
 * transformations (set NEXT_PUBLIC_IMAGE_TRANSFORM=on once confirmed available
 * on the project's plan); otherwise returns the original URL.
 */
export function mediaThumbUrl(storagePath: string, width: number) {
  if (!IMAGE_TRANSFORM) return mediaPublicUrl(storagePath);
  // resize=contain is required: with only `width`, Supabase keeps the original
  // height and crops (cover) into a distorted vertical/horizontal slice.
  // `contain` scales proportionally to the given width, preserving aspect ratio.
  return `${SUPABASE_URL}/storage/v1/render/image/public/media/${storagePath}?width=${width}&resize=contain&quality=75`;
}
