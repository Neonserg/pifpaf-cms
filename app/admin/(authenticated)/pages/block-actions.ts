"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type BlockType = "text" | "columns" | "gallery" | "media";

function defaultData(type: BlockType): Json {
  if (type === "text") return { html: "" };
  if (type === "columns") return { cols: 2, values: ["", ""] };
  if (type === "gallery") return { layout: "tile", media: [], captions: {} };
  return { mediaId: null, width: "original", align: "center" };
}

async function reindex(pageId: string, orderedIds: string[]) {
  const supabase = await createServerSupabaseClient();
  await Promise.all(
    orderedIds.map((id, i) => supabase.from("blocks").update({ sort_order: i }).eq("id", id))
  );
  revalidatePath("/admin/pages");
}

export async function createBlock(pageId: string, type: BlockType, afterBlockId: string | null) {
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("blocks")
    .select("id")
    .eq("page_id", pageId)
    .order("sort_order", { ascending: true });

  const ids = (existing ?? []).map((b) => b.id);

  const { data: created, error } = await supabase
    .from("blocks")
    .insert({ page_id: pageId, type, data: defaultData(type), sort_order: ids.length })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const insertAt = afterBlockId ? ids.indexOf(afterBlockId) + 1 : 0;
  ids.splice(insertAt, 0, created.id);
  await reindex(pageId, ids);

  return created;
}

export async function updateBlockData(blockId: string, data: Json) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("blocks").update({ data }).eq("id", blockId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pages");
}

export async function deleteBlock(pageId: string, blockId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("blocks").delete().eq("id", blockId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pages");
}

export async function duplicateBlock(pageId: string, blockId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: original, error: fetchError } = await supabase
    .from("blocks")
    .select("type, data")
    .eq("id", blockId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const { data: existing } = await supabase
    .from("blocks")
    .select("id")
    .eq("page_id", pageId)
    .order("sort_order", { ascending: true });
  const ids = (existing ?? []).map((b) => b.id);

  const { data: created, error } = await supabase
    .from("blocks")
    .insert({ page_id: pageId, type: original.type, data: original.data, sort_order: ids.length })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const insertAt = ids.indexOf(blockId) + 1;
  ids.splice(insertAt, 0, created.id);
  await reindex(pageId, ids);
}

export async function reorderBlocks(pageId: string, orderedIds: string[]) {
  await reindex(pageId, orderedIds);
}
