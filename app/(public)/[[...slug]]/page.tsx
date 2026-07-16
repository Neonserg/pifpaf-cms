import { notFound } from "next/navigation";
import { getPublicSiteData, resolvePagePath } from "@/lib/public-pages";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import PublicBlocks from "../blocks/public-blocks";
import PublicForm from "../forms/public-form";

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const data = await getPublicSiteData();
  const page = resolvePagePath(slug, data);

  if (!page || page.type !== "content") {
    notFound();
  }

  const supabase = await createServerSupabaseClient();
  const { data: form } = await supabase.from("forms").select("*").eq("page_id", page.id).maybeSingle();

  return (
    <article className="public-page">
      <h1 className="public-page-title">{page.title}</h1>
      <PublicBlocks pageId={page.id} />
      {form && <PublicForm form={form} />}
    </article>
  );
}
