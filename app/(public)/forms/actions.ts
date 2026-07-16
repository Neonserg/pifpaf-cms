"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export async function submitForm(formId: string, data: Record<string, string | boolean>) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("form_submissions")
    .insert({ form_id: formId, data: data as unknown as Json });
  if (error) throw new Error(error.message);
}
