"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/database.types";

export async function updateSettings(fields: TablesUpdate<"settings">) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("settings").update(fields).not("id", "is", null);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
}
