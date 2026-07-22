"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db/client";
import { pages, settings } from "@/lib/db/schema";
import type { PageInsert } from "@/lib/db/schema";

export async function createPage(input: {
  type: "category" | "content" | "link" | "spacer";
  title: string;
  parent_id: string | null;
}) {
  await requireAdmin();

  const [lastSibling] = await db
    .select({ sort_order: pages.sort_order })
    .from(pages)
    .where(input.parent_id === null ? isNull(pages.parent_id) : eq(pages.parent_id, input.parent_id))
    .orderBy(desc(pages.sort_order))
    .limit(1);

  const nextOrder = (lastSibling?.sort_order ?? -1) + 1;

  const payload: PageInsert = {
    type: input.type,
    title: input.title,
    parent_id: input.parent_id,
    sort_order: nextOrder,
  };

  await db.insert(pages).values(payload);

  revalidatePath("/admin/pages");
  revalidatePath("/", "layout");
}

export async function updatePage(id: string, fields: Partial<PageInsert>) {
  await requireAdmin();
  await db.update(pages).set(fields).where(eq(pages.id, id));
  revalidatePath("/admin/pages");
  revalidatePath("/", "layout");
}

export async function deletePage(id: string) {
  await requireAdmin();
  await db.delete(pages).where(eq(pages.id, id));
  revalidatePath("/admin/pages");
  revalidatePath("/", "layout");
}

export async function reorderPages(updates: { id: string; sort_order: number }[]) {
  await requireAdmin();
  await Promise.all(
    updates.map(({ id, sort_order }) => db.update(pages).set({ sort_order }).where(eq(pages.id, id)))
  );
  revalidatePath("/admin/pages");
  revalidatePath("/", "layout");
}

export async function setHomePage(id: string) {
  await requireAdmin();
  // Only one page can be home at a time.
  await db.update(pages).set({ is_home: false }).where(eq(pages.is_home, true));
  await db.update(pages).set({ is_home: true }).where(eq(pages.id, id));
  await db.update(settings).set({ home_page_id: id });
  revalidatePath("/admin/pages");
  revalidatePath("/", "layout");
}
