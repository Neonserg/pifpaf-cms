import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Page = Tables<"pages">;
export type SiteSettings = Tables<"settings">;

export type PageNode = Page & { children: PageNode[]; fullPath: string | null };

export type PublicSiteData = {
  settings: SiteSettings | null;
  tree: PageNode[];
  pathMap: Map<string, Page>;
  homePage: Page | null;
};

/** Home resolves to "/"; every other page's path is its slug chain up to (not including) the home page. */
function computeFullPath(page: Page, byId: Map<string, Page>): string | null {
  if (page.is_home) return "";
  const segments: string[] = [];
  let current: Page | undefined = page;
  while (current && !current.is_home) {
    if (!current.slug) return null;
    segments.unshift(current.slug);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return segments.join("/");
}

export const getPublicSiteData = cache(async (): Promise<PublicSiteData> => {
  const supabase = await createServerSupabaseClient();
  const [{ data: pages }, { data: settings }] = await Promise.all([
    supabase.from("pages").select("*").order("sort_order", { ascending: true }),
    supabase.from("settings").select("*").single(),
  ]);

  const allPages = pages ?? [];
  const byId = new Map(allPages.map((p) => [p.id, p]));
  const pathMap = new Map<string, Page>();
  let homePage: Page | null = null;

  for (const page of allPages) {
    if (page.is_home && page.type === "content") homePage = page;
    if (page.type !== "content") continue;
    const fullPath = computeFullPath(page, byId);
    if (fullPath !== null) pathMap.set(fullPath, page);
  }

  // Sidebar tree: only pages visible in the menu (is_hidden excludes menu presence,
  // not direct URL access), grouped by parent_id and sorted by sort_order.
  const menuPages = allPages.filter((p) => !p.is_hidden);
  const byParent = new Map<string | null, Page[]>();
  for (const page of menuPages) {
    const key = page.parent_id;
    const siblings = byParent.get(key) ?? [];
    siblings.push(page);
    byParent.set(key, siblings);
  }

  function buildNodes(parentId: string | null): PageNode[] {
    const children = byParent.get(parentId) ?? [];
    return children.map((page) => ({
      ...page,
      fullPath: page.type === "content" ? computeFullPath(page, byId) : null,
      children: buildNodes(page.id),
    }));
  }

  return { settings: settings ?? null, tree: buildNodes(null), pathMap, homePage };
});

export function resolvePagePath(slug: string[] | undefined, data: PublicSiteData): Page | null {
  if (!slug || slug.length === 0) return data.homePage;
  return data.pathMap.get(slug.join("/")) ?? null;
}
