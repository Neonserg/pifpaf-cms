"use server";

import { eq } from "drizzle-orm";
import { compare, hash } from "bcryptjs";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db/client";
import { admins } from "@/lib/db/schema";

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await requireAdmin();

  if (newPassword.length < 8) {
    throw new Error("Новий пароль має містити щонайменше 8 символів");
  }

  const [admin] = await db.select().from(admins).where(eq(admins.id, session.sub)).limit(1);
  if (!admin) throw new Error("Акаунт не знайдено");

  const ok = await compare(currentPassword, admin.password_hash);
  if (!ok) throw new Error("Невірний поточний пароль");

  const newHash = await hash(newPassword, 10);
  await db.update(admins).set({ password_hash: newHash }).where(eq(admins.id, session.sub));
}
