import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mediaPublicUrl } from "@/lib/media-url";
import { sanitizeHtml } from "@/lib/sanitize-html";
import type { Tables } from "@/lib/supabase/database.types";
import type {
  TextData,
  ColumnsData,
  GalleryData,
  MediaBlockData,
} from "@/app/admin/(authenticated)/pages/block-actions";
import PublicGallery from "./public-gallery";

type Block = Tables<"blocks">;
type Media = Tables<"media">;

const WIDTH_PCT: Record<MediaBlockData["width"], number | null> = {
  original: null,
  "100": 100,
  "50": 50,
  "33": 33.333,
};

const JUSTIFY: Record<MediaBlockData["align"], string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

export default async function PublicBlocks({ pageId }: { pageId: string }) {
  const supabase = await createServerSupabaseClient();
  const { data: blocks } = await supabase
    .from("blocks")
    .select("*")
    .eq("page_id", pageId)
    .order("sort_order", { ascending: true });

  if (!blocks || blocks.length === 0) return null;

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
    const { data: mediaRows } = await supabase.from("media").select("*").in("id", [...mediaIds]);
    for (const row of mediaRows ?? []) mediaById.set(row.id, row);
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
            style={style}
            width={item.width ?? undefined}
            height={item.height ?? undefined}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaPublicUrl(item.storage_path)}
            alt=""
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
