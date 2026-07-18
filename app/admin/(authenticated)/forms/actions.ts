"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/supabase/guard";
import type { Json } from "@/lib/supabase/database.types";

export type FieldType = "text" | "email" | "tel" | "textarea" | "checkbox";
export type FormField = { id: string; type: FieldType; label: string; required: boolean };

export async function createForm(title: string) {
  const supabase = await requireAdminClient();
  const { data, error } = await supabase
    .from("forms")
    .insert({ title, fields: [] as unknown as Json, page_id: null })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/forms");
  revalidatePath("/", "layout");
  return data;
}

export async function updateForm(
  id: string,
  fields: { title?: string; page_id?: string | null; fields?: FormField[] }
) {
  const supabase = await requireAdminClient();
  const payload: { title?: string; page_id?: string | null; fields?: Json } = {
    ...(fields.title !== undefined ? { title: fields.title } : {}),
    ...(fields.page_id !== undefined ? { page_id: fields.page_id } : {}),
    ...(fields.fields !== undefined ? { fields: fields.fields as unknown as Json } : {}),
  };
  const { error } = await supabase.from("forms").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/forms");
  revalidatePath("/", "layout");
}

export async function deleteForm(id: string) {
  const supabase = await requireAdminClient();
  const { error } = await supabase.from("forms").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/forms");
  revalidatePath("/", "layout");
}

export async function markSubmissionRead(id: string, isRead: boolean) {
  const supabase = await requireAdminClient();
  const { error } = await supabase.from("form_submissions").update({ is_read: isRead }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/forms");
}

export async function deleteSubmission(id: string) {
  const supabase = await requireAdminClient();
  const { error } = await supabase.from("form_submissions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/forms");
}
