import { createServerSupabaseClient } from "@/lib/supabase/server";
import FormsManager from "./forms-manager";

export default async function FormsPage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: forms, error: formsError }, { data: pages }, { data: submissions }] = await Promise.all([
    supabase.from("forms").select("*").order("created_at", { ascending: true }),
    supabase.from("pages").select("*").eq("type", "content").order("title", { ascending: true }),
    supabase.from("form_submissions").select("*").order("created_at", { ascending: false }),
  ]);

  if (formsError) {
    return <div style={{ padding: 24, color: "var(--rec)" }}>Помилка: {formsError.message}</div>;
  }

  return (
    <FormsManager
      initialForms={forms ?? []}
      initialPages={pages ?? []}
      initialSubmissions={submissions ?? []}
    />
  );
}
