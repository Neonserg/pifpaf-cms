import { cache } from "react";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pages, settings } from "@/lib/db/schema";
import type { PageRow, SettingsRow } from "@/lib/db/schema";

export type Page = PageRow;
export type SiteSettings = SettingsRow;

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
  const [allPages, settingsRows] = await Promise.all([
    db.select().from(pages).orderBy(asc(pages.sort_order)),
    db.select().from(settings).limit(1),
  ]);

  const byId = new Map(allPages.map((p) => [p.id, p]));
  const pathMap = new Map<string, Page>();
  let homePage: Page | null = null;

  for (const page of allPages) {
    if (page.is_home && page.type === "content") homePage = page;
    if (page.type !== "content" && page.type !== "category") continue;
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
      fullPath: page.type === "content" || page.type === "category" ? computeFullPath(page, byId) : null,
      children: buildNodes(page.id),
    }));
  }

  return { settings: settingsRows[0] ?? null, tree: buildNodes(null), pathMap, homePage };
});

export function resolvePagePath(slug: string[] | undefined, data: PublicSiteData): Page | null {
  if (!slug || slug.length === 0) return data.homePage;
  return data.pathMap.get(slug.join("/")) ?? null;
}
