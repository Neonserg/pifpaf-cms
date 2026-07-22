import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { blocks as blocksTable, media as mediaTable } from "@/lib/db/schema";
import { mediaPublicUrl, mediaThumbUrl } from "@/lib/media-url";
import { sanitizeHtml } from "@/lib/sanitize-html";
import type { BlockRow, MediaRow } from "@/lib/db/schema";
import type {
  TextData,
  ColumnsData,
  GalleryData,
  MediaBlockData,
} from "@/app/admin/(authenticated)/pages/block-actions";
import PublicGallery from "./public-gallery";

type Block = BlockRow;
type Media = MediaRow;

const WIDTH_PCT: Record<MediaBlockData["width"], number | null> = {
  original: null,
  "100": 100,
  "50": 50,
  "33": 33.333,
};

// Requested thumbnail width per display width (~2x for retina, capped at the
// content column). "original" can still be huge, so it gets the full-column
// variant rather than the untouched source file.
const THUMB_WIDTH: Record<MediaBlockData["width"], number> = {
  original: 1400,
  "100": 1400,
  "50": 800,
  "33": 600,
};

const JUSTIFY: Record<MediaBlockData["align"], string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

export default async function PublicBlocks({ pageId }: { pageId: string }) {
  const blocks = await db
    .select()
    .from(blocksTable)
    .where(eq(blocksTable.page_id, pageId))
    .orderBy(asc(blocksTable.sort_order));

  if (blocks.length === 0) return null;

  const mediaIds = new Set<string>();
  for (const block of blocks) {
    if (block.type === "gallery") {
      for (const id of (block.data as GalleryData).media) mediaIds.add(id);
    } else if (block.type === "media") {
      const id = (block.data as MediaBlockData).mediaId;
      if (id) mediaIds.add(id);
    }
  }

  const mediaById = new Map<string, Media>();
  if (mediaIds.size > 0) {
    const mediaRows = await db.select().from(mediaTable).where(inArray(mediaTable.id, [...mediaIds]));
    for (const row of mediaRows) mediaById.set(row.id, row);
  }

  return (
    <div className="public-blocks">
      {blocks.map((block) => (
        <PublicBlock key={block.id} block={block} mediaById={mediaById} />
      ))}
    </div>
  );
}

function PublicBlock({ block, mediaById }: { block: Block; mediaById: Map<string, Media> }) {
  if (block.type === "text") {
    const data = block.data as TextData;
    return <div className="public-block public-block-text" dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.html) }} />;
  }

  if (block.type === "columns") {
    const data = block.data as ColumnsData;
    return (
      <div className="public-block public-block-columns">
        {data.values.map((html, i) => (
          <div key={i} className="public-block-column" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
        ))}
      </div>
    );
  }

  if (block.type === "media") {
    const data = block.data as MediaBlockData;
    const item = data.mediaId ? mediaById.get(data.mediaId) : null;
    if (!item) return null;

    const widthPct = WIDTH_PCT[data.width];
    const style: React.CSSProperties =
      widthPct === null
        ? { maxWidth: "100%", width: "auto", height: "auto" }
        : { width: `${widthPct}%`, height: "auto" };

    return (
      <div className="public-block public-block-media" style={{ display: "flex", justifyContent: JUSTIFY[data.align] }}>
        {item.type === "video" ? (
          <video
            src={mediaPublicUrl(item.storage_path)}
            controls
            preload="metadata"
            style={style}
            width={item.width ?? undefined}
            height={item.height ?? undefined}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaThumbUrl(item.storage_path, THUMB_WIDTH[data.width])}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ ...style, display: "block" }}
            width={item.width ?? undefined}
            height={item.height ?? undefined}
          />
        )}
      </div>
    );
  }

  if (block.type === "gallery") {
    const data = block.data as GalleryData;
    const items = data.media.map((id) => mediaById.get(id)).filter((m): m is Media => Boolean(m));
    if (items.length === 0) return null;
    return (
      <div className="public-block public-block-gallery">
        <PublicGallery layout={data.layout} items={items} captions={data.captions} />
      </div>
    );
  }

  return null;
}
