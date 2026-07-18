"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/supabase/guard";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";

async function client() {
  return requireAdminClient();
}

export async function createPage(input: {
  type: "category" | "content" | "link" | "spacer";
  title: string;
  parent_id: string | null;
}) {
  const supabase = await client();

  const siblingsQuery = supabase
    .from("pages")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const { data: siblings } =
    input.parent_id === null
      ? await siblingsQuery.is("parent_id", null)
      : await siblingsQuery.eq("parent_id", input.parent_id);

  const nextOrder = (siblings?.[0]?.sort_order ?? -1) + 1;

  const payload: TablesInsert<"pages"> = {
    type: input.type,
    title: input.title,
    parent_id: input.parent_id,
    sort_order: nextOrder,
  };

  const { error } = await supabase.from("pages").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/pages");
  revalidatePath("/", "layout");
}

export async function updatePage(id: string, fields: TablesUpdate<"pages">) {
  const supabase = await client();
  const { error } = await supabase.from("pages").update(fields).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pages");
  revalidatePath("/", "layout");
}

export async function deletePage(id: string) {
  const supabase = await client();
  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pages");
  revalidatePath("/", "layout");
}

export async function reorderPages(updates: { id: string; sort_order: number }[]) {
  const supabase = await client();
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from("pages").update({ sort_order }).eq("id", id)
    )
  );
  revalidatePath("/admin/pages");
  revalidatePath("/", "layout");
}

export async function setHomePage(id: string) {
  const supabase = await client();
  // Only one page can be home at a time.
  await supabase.from("pages").update({ is_home: false }).eq("is_home", true);
  const { error } = await supabase.from("pages").update({ is_home: true }).eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("settings").update({ home_page_id: id }).not("id", "is", null);
  revalidatePath("/admin/pages");
  revalidatePath("/", "layout");
}
