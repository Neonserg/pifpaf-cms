import { notFound } from "next/navigation";
import { getPublicSiteData, resolvePagePath } from "@/lib/public-pages";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import PublicBlocks from "../blocks/public-blocks";
import PublicForm from "../forms/public-form";
import CategoryIndex from "../blocks/category-index";

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const data = await getPublicSiteData();
  const page = resolvePagePath(slug, data);

  if (!page || (page.type !== "content" && page.type !== "category")) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();

  if (page.type === "category") {
    const { data: children } = await supabase
      .from("pages")
      .select("*")
      .eq("parent_id", page.id)
      .eq("type", "content")
      .order("sort_order", { ascending: true });

    return (
      <article className="public-page">
        <h1 className="public-page-title">{page.title}</h1>
        <CategoryIndex pages={children ?? []} basePath={slug!.join("/")} />
      </article>
    );
  }

  const { data: form } = await supabase.from("forms").select("*").eq("page_id", page.id).maybeSingle();

  return (
    <article className="public-page">
      {!page.is_home && <h1 className="public-page-title">{page.title}</h1>}
      <PublicBlocks pageId={page.id} />
      {form && <PublicForm form={form} />}
    </article>
  );
}
