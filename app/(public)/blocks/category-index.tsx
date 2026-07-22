import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { blocks as blocksTable, media as mediaTable } from "@/lib/db/schema";
import { mediaThumbUrl } from "@/lib/media-url";
import type { PageRow } from "@/lib/db/schema";
import type { GalleryData } from "@/app/admin/(authenticated)/pages/block-actions";

type Page = PageRow;

export default async function CategoryIndex({ pages, basePath }: { pages: Page[]; basePath: string }) {
  if (pages.length === 0) return null;

  const blocks = await db
    .select({ page_id: blocksTable.page_id, data: blocksTable.data })
    .from(blocksTable)
    .where(and(eq(blocksTable.type, "gallery"), inArray(blocksTable.page_id, pages.map((p) => p.id))))
    .orderBy(asc(blocksTable.sort_order));

  const firstMediaIdByPage = new Map<string, string>();
  for (const block of blocks) {
    if (firstMediaIdByPage.has(block.page_id)) continue;
    const mediaId = (block.data as GalleryData).media?.[0];
    if (mediaId) firstMediaIdByPage.set(block.page_id, mediaId);
  }

  const thumbIds = [...firstMediaIdByPage.values()];
  const thumbById = new Map<string, { storage_path: string }>();
  if (thumbIds.length > 0) {
    const mediaRows = await db
      .select({ id: mediaTable.id, storage_path: mediaTable.storage_path })
      .from(mediaTable)
      .where(inArray(mediaTable.id, thumbIds));
    for (const row of mediaRows) thumbById.set(row.id, row);
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
                <img src={mediaThumbUrl(thumb.storage_path, 500)} alt="" loading="lazy" decoding="async" />
              )}
              <span>{page.title}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
