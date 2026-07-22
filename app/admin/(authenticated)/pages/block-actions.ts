"use server";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db/client";
import { blocks } from "@/lib/db/schema";
import type { Json } from "@/lib/db/schema";

export type BlockType = "text" | "columns" | "gallery" | "media";

export type TextData = { html: string };
export type ColumnsData = { cols: 2 | 3; values: string[] };
export type GalleryData = { layout: "tile" | "vertical" | "horizontal"; media: string[]; captions: Record<string, string> };
export type MediaBlockData = { mediaId: string | null; width: "original" | "100" | "50" | "33"; align: "left" | "center" | "right" };

function defaultData(type: BlockType): Json {
  if (type === "text") return { html: "" };
  if (type === "columns") return { cols: 2, values: ["", ""] };
  if (type === "gallery") return { layout: "tile", media: [], captions: {} };
  return { mediaId: null, width: "original", align: "center" };
}

async function reindex(pageId: string, orderedIds: string[]) {
  await requireAdmin();
  await Promise.all(orderedIds.map((id, i) => db.update(blocks).set({ sort_order: i }).where(eq(blocks.id, id))));
  revalidatePath("/admin/pages");
  revalidatePath("/", "layout");
}

export async function createBlock(pageId: string, type: BlockType, afterBlockId: string | null) {
  await requireAdmin();

  const existing = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(eq(blocks.page_id, pageId))
    .orderBy(asc(blocks.sort_order));

  const ids = existing.map((b) => b.id);

  const [created] = await db
    .insert(blocks)
    .values({ page_id: pageId, type, data: defaultData(type), sort_order: ids.length })
    .returning();

  const insertAt = afterBlockId ? ids.indexOf(afterBlockId) + 1 : 0;
  ids.splice(insertAt, 0, created.id);
  await reindex(pageId, ids);

  return created;
}

export async function updateBlockData(blockId: string, data: Json) {
  await requireAdmin();
  await db.update(blocks).set({ data }).where(eq(blocks.id, blockId));
  revalidatePath("/admin/pages");
  revalidatePath("/", "layout");
}

export async function deleteBlock(pageId: string, blockId: string) {
  await requireAdmin();
  await db.delete(blocks).where(eq(blocks.id, blockId));
  revalidatePath("/admin/pages");
  revalidatePath("/", "layout");
}

export async function duplicateBlock(pageId: string, blockId: string) {
  await requireAdmin();

  const [original] = await db
    .select({ type: blocks.type, data: blocks.data })
    .from(blocks)
    .where(eq(blocks.id, blockId))
    .limit(1);
  if (!original) throw new Error("Block not found");

  const existing = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(eq(blocks.page_id, pageId))
    .orderBy(asc(blocks.sort_order));
  const ids = existing.map((b) => b.id);

  const [created] = await db
    .insert(blocks)
    .values({ page_id: pageId, type: original.type, data: original.data, sort_order: ids.length })
    .returning();

  const insertAt = ids.indexOf(blockId) + 1;
  ids.splice(insertAt, 0, created.id);
  await reindex(pageId, ids);
}

export async function reorderBlocks(pageId: string, orderedIds: string[]) {
  await reindex(pageId, orderedIds);
}
