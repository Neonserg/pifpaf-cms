import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSiteData, resolvePagePath } from "@/lib/public-pages";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import PublicBlocks from "../blocks/public-blocks";
import PublicForm from "../forms/public-form";
import CategoryIndex from "../blocks/category-index";
import GalleryZoomControl from "../gallery-zoom-control";

// ISR: public pages are cached and re-rendered at most every 5 minutes; admin
// actions additionally revalidate the whole public layout on every publish, so
// edits show up immediately. Requires that nothing in the public tree reads
// cookies/headers — public data goes through the cookie-less client.
export const revalidate = 300;

// Prerender every known public path at build time; new pages created after the
// build are still served via on-demand ISR (dynamicParams defaults to true).
export async function generateStaticParams() {
  const { pathMap } = await getPublicSiteData();
  return [...pathMap.keys()].map((path) => ({ slug: path === "" ? [] : path.split("/") }));
}

type Params = Promise<{ slug?: string[] }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicSiteData();
  const page = resolvePagePath(slug, data);
  if (!page || (page.type !== "content" && page.type !== "category")) return {};

  const siteTitle = data.settings?.site_title ?? "pifpaf";
  const title = page.is_home ? siteTitle : `${page.title} — ${siteTitle}`;
  return { title, openGraph: { title } };
}

export default async function PublicPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getPublicSiteData();
  const page = resolvePagePath(slug, data);

  if (!page || (page.type !== "content" && page.type !== "category")) {
    notFound();
  }

  const supabase = createPublicSupabaseClient();

  if (page.type === "category") {
    const { data: children } = await supabase
      .from("pages")
      .select("*")
      .eq("parent_id", page.id)
      .eq("type", "content")
      .order("sort_order", { ascending: true });

    return (
      <article className="public-page">
        <div className="public-page-header">
          <h1 className="public-page-title">{page.title}</h1>
        </div>
        <CategoryIndex pages={children ?? []} basePath={slug!.join("/")} />
      </article>
    );
  }

  const { data: form } = await supabase.from("forms").select("*").eq("page_id", page.id).maybeSingle();

  return (
    <article className="public-page">
      <div className="public-page-header">
        {!page.is_home && <h1 className="public-page-title">{page.title}</h1>}
        <GalleryZoomControl />
      </div>
      <PublicBlocks pageId={page.id} />
      {form && <PublicForm form={form} />}
    </article>
  );
}
