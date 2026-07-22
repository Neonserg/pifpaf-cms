"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db/client";
import { media } from "@/lib/db/schema";
import type { MediaInsert } from "@/lib/db/schema";
import { deleteObject } from "@/lib/storage/r2";

export async function recordUploadedMedia(input: {
  filename: string;
  type: "photo" | "video";
  storage_path: string;
  width: number;
  height: number;
}) {
  await requireAdmin();
  const payload: MediaInsert = input;
  const [created] = await db.insert(media).values(payload).returning();
  revalidatePath("/admin/media");
  return created;
}

export async function deleteMedia(id: string, storagePath: string) {
  await requireAdmin();
  await deleteObject(storagePath);
  await db.delete(media).where(eq(media.id, id));
  revalidatePath("/admin/media");
  // Deleted media may be referenced by public gallery/media blocks.
  revalidatePath("/", "layout");
}
