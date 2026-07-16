import { createBrowserSupabaseClient } from "./supabase/client";

export function mediaPublicUrl(storagePath: string) {
  const supabase = createBrowserSupabaseClient();
  return supabase.storage.from("media").getPublicUrl(storagePath).data.publicUrl;
}
