"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import type { GalleryData } from "@/app/admin/(authenticated)/pages/block-actions";
import { mediaPublicUrl } from "@/lib/media-url";
import { computeJustified } from "@/lib/gallery-layout";
import Lightbox from "./lightbox";

type Media = Tables<"media">;

const TILE_ROW_HEIGHT = 260;
const HORIZONTAL_HEIGHT = 260;

export default function PublicGallery({
  layout,
  items,
  captions,
}: {
  layout: GalleryData["layout"];
  items: Media[];
  captions: Record<string, string>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(960);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (layout !== "tile" || !containerRef.current) return;
    const el = containerRef.current;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout]);

  const justified = useMemo(
    () => (layout === "tile" ? computeJustified(items, containerWidth, TILE_ROW_HEIGHT) : null),
    [layout, items, containerWidth]
  );

  return (
    <>
      <div
        ref={containerRef}
        className={`public-gallery public-gallery-${layout}`}
        style={layout === "tile" ? { position: "relative", height: justified?.totalHeight ?? 0 } : undefined}
      >
        {layout === "tile"
          ? justified?.positions.map(({ item, left, top, width, height }, i) => (
              <GalleryItem
                key={item.id}
                item={item}
                caption={captions[item.id]}
                style={{ position: "absolute", left, top, width, height }}
                onClick={() => setLightboxIndex(i)}
              />
            ))
          : items.map((item, i) => (
              <GalleryItem
                key={item.id}
                item={item}
                caption={captions[item.id]}
                style={layout === "horizontal" ? { height: HORIZONTAL_HEIGHT, flex: "none" } : { width: "100%" }}
                onClick={() => setLightboxIndex(i)}
              />
            ))}
      </div>
      {lightboxIndex !== null && (
        <Lightbox items={items} captions={captions} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </>
  );
}

function GalleryItem({
  item,
  caption,
  style,
  onClick,
}: {
  item: Media;
  caption?: string;
  style: React.CSSProperties;
  onClick: () => void;
}) {
  return (
    <button type="button" className="public-gallery-item" style={style} onClick={onClick}>
      {item.type === "video" ? (
        <>
          <video src={mediaPublicUrl(item.storage_path)} muted playsInline />
          <span className="public-gallery-play" aria-hidden="true" />
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaPublicUrl(item.storage_path)} alt={caption ?? ""} loading="lazy" />
      )}
      {caption && <span className="public-gallery-caption">{caption}</span>}
    </button>
  );
}
