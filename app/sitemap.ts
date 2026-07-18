import type { MetadataRoute } from "next";
import { getPublicSiteData } from "@/lib/public-pages";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pifpaf.online";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { pathMap } = await getPublicSiteData();

  return [...pathMap.entries()].map(([path, page]) => ({
    url: path === "" ? BASE_URL : `${BASE_URL}/${path}`,
    lastModified: new Date(page.updated_at),
    priority: page.is_home ? 1 : 0.7,
  }));
}
