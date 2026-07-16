import { createServerSupabaseClient } from "@/lib/supabase/server";
import PagesManager from "./pages-manager";

export default async function PagesAdminPage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: pages, error }, { data: blocks, error: blocksError }, { data: media }] = await Promise.all([
    supabase.from("pages").select("*").order("sort_order", { ascending: true }),
    supabase.from("blocks").select("*").order("sort_order", { ascending: true }),
    supabase.from("media").select("*").order("created_at", { ascending: false }),
  ]);

  if (error || blocksError) {
    return <div style={{ padding: 24, color: "var(--rec)" }}>Помилка: {(error ?? blocksError)?.message}</div>;
  }

  return <PagesManager initialPages={pages ?? []} initialBlocks={blocks ?? []} initialMedia={media ?? []} />;
}
