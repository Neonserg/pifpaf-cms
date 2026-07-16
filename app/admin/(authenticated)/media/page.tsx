import { createServerSupabaseClient } from "@/lib/supabase/server";
import MediaLibrary from "./media-library";

export default async function MediaAdminPage() {
  const supabase = await createServerSupabaseClient();
  const { data: media, error } = await supabase
    .from("media")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return <div style={{ padding: 24, color: "var(--rec)" }}>Помилка: {error.message}</div>;
  }

  return <MediaLibrary initialMedia={media ?? []} />;
}
