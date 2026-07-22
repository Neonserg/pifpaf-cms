"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";

export async function updateSettings(fields: Partial<typeof settings.$inferInsert>) {
  await requireAdmin();
  await db.update(settings).set(fields);
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
}
