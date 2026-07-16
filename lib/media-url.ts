// Pure string construction (no Supabase client needed — the public URL format
// is deterministic), so this is safe to call from both server and client code.
export function mediaPublicUrl(storagePath: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${storagePath}`;
}
