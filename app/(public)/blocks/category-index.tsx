import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mediaPublicUrl } from "@/lib/media-url";
import type { Tables } from "@/lib/supabase/database.types";
import type { GalleryData } from "@/app/admin/(authenticated)/pages/block-actions";

type Page = Tables<"pages">;

export default async function CategoryIndex({ pages, basePath }: { pages: Page[]; basePath: string }) {
  if (pages.length === 0) return null;

  const supabase = await createServerSupabaseClient();
  const { data: blocks } = await supabase
    .from("blocks")
    .select("page_id, data")
    .eq("type", "gallery")
    .in(
      "page_id",
      pages.map((p) => p.id)
    )
    .order("sort_order", { ascending: true });

  const firstMediaIdByPage = new Map<string, string>();
  for (const block of blocks ?? []) {
    if (firstMediaIdByPage.has(block.page_id)) continue;
    const mediaId = (block.data as GalleryData).media?.[0];
    if (mediaId) firstMediaIdByPage.set(block.page_id, mediaId);
  }

  const thumbIds = [...firstMediaIdByPage.values()];
  const thumbById = new Map<string, { storage_path: string }>();
  if (thumbIds.length > 0) {
    const { data: mediaRows } = await supabase.from("media").select("id, storage_path").in("id", thumbIds);
    for (const row of mediaRows ?? []) thumbById.set(row.id, row);
  }

  return (
    <ul className="public-category-index">
      {pages.map((page) => {
        const mediaId = page.slug ? firstMediaIdByPage.get(page.id) : null;
        const thumb = mediaId ? thumbById.get(mediaId) : null;
        return (
          <li key={page.id}>
            <Link href={`/${basePath}/${page.slug}`} className="public-category-thumb">
              {thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaPublicUrl(thumb.storage_path)} alt="" loading="lazy" />
              )}
              <span>{page.title}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
