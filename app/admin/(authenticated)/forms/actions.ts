"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db/client";
import { forms, form_submissions } from "@/lib/db/schema";
import type { Json } from "@/lib/db/schema";

export type FieldType = "text" | "email" | "tel" | "textarea" | "checkbox";
export type FormField = { id: string; type: FieldType; label: string; required: boolean };

export async function createForm(title: string) {
  await requireAdmin();
  const [created] = await db
    .insert(forms)
    .values({ title, fields: [] as unknown as Json, page_id: null })
    .returning();
  revalidatePath("/admin/forms");
  revalidatePath("/", "layout");
  return created;
}

export async function updateForm(
  id: string,
  fields: { title?: string; page_id?: string | null; fields?: FormField[] }
) {
  await requireAdmin();
  const payload: { title?: string; page_id?: string | null; fields?: Json } = {
    ...(fields.title !== undefined ? { title: fields.title } : {}),
    ...(fields.page_id !== undefined ? { page_id: fields.page_id } : {}),
    ...(fields.fields !== undefined ? { fields: fields.fields as unknown as Json } : {}),
  };
  await db.update(forms).set(payload).where(eq(forms.id, id));
  revalidatePath("/admin/forms");
  revalidatePath("/", "layout");
}

export async function deleteForm(id: string) {
  await requireAdmin();
  await db.delete(forms).where(eq(forms.id, id));
  revalidatePath("/admin/forms");
  revalidatePath("/", "layout");
}

export async function markSubmissionRead(id: string, isRead: boolean) {
  await requireAdmin();
  await db.update(form_submissions).set({ is_read: isRead }).where(eq(form_submissions.id, id));
  revalidatePath("/admin/forms");
}

export async function deleteSubmission(id: string) {
  await requireAdmin();
  await db.delete(form_submissions).where(eq(form_submissions.id, id));
  revalidatePath("/admin/forms");
}
