import { createServerSupabaseClient } from "@/lib/supabase/server";
import PagesManager from "./pages-manager";

export default async function PagesAdminPage() {
  const supabase = await createServerSupabaseClient();
  const { data: pages, error } = await supabase
    .from("pages")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return <div style={{ padding: 24, color: "var(--rec)" }}>Помилка: {error.message}</div>;
  }

  return <PagesManager initialPages={pages ?? []} />;
}
