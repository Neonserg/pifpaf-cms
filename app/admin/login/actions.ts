"use server";

import { redirect } from "next/navigation";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { admins } from "@/lib/db/schema";
import { signSession, setSessionCookie } from "@/lib/auth/session";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const [admin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);

  const passwordOk = admin ? await compare(password, admin.password_hash) : false;
  if (!admin || !passwordOk) {
    redirect(`/admin/login?error=${encodeURIComponent("Невірний email або пароль")}`);
  }

  const token = await signSession({ sub: admin.id, email: admin.email });
  await setSessionCookie(token);

  redirect("/admin/pages");
}
