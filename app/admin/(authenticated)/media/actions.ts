"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/database.types";

export async function recordUploadedMedia(input: {
  filename: string;
  type: "photo" | "video";
  storage_path: string;
  width: number;
  height: number;
}) {
  const supabase = await createServerSupabaseClient();
  const payload: TablesInsert<"media"> = input;
  const { data, error } = await supabase.from("media").insert(payload).select().single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/media");
  return data;
}

export async function deleteMedia(id: string, storagePath: string) {
  const supabase = await createServerSupabaseClient();
  await supabase.storage.from("media").remove([storagePath]);
  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/media");
}
