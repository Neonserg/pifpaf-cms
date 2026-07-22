"use server";

import { requireAdmin } from "@/lib/auth/guard";
import { getUploadUrl } from "./r2";

/** Mints a presigned R2 PUT URL for an admin-initiated client-side upload. */
export async function requestMediaUpload(filename: string, contentType: string) {
  await requireAdmin();
  const key = `${crypto.randomUUID()}-${filename}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  return { key, uploadUrl };
}
