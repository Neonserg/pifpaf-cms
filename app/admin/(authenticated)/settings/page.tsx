import { createServerSupabaseClient } from "@/lib/supabase/server";
import SettingsForm from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: settings, error } = await supabase.from("settings").select("*").single();

  if (error || !settings) {
    return <div style={{ padding: 24, color: "var(--rec)" }}>Помилка: {error?.message}</div>;
  }

  return <SettingsForm initialSettings={settings} />;
}
