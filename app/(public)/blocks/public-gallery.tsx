"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { MediaRow } from "@/lib/db/schema";
import type { GalleryData } from "@/app/admin/(authenticated)/pages/block-actions";
import { mediaPublicUrl, mediaThumbUrl } from "@/lib/media-url";
import { computeJustified } from "@/lib/gallery-layout";
import { THUMB_GENERATION_STEP, zoomScale } from "@/lib/gallery-zoom";
import { useGalleryZoom } from "../gallery-zoom-context";
import Lightbox from "./lightbox";

type Media = MediaRow;

// Base (zoom step 0) on-screen sizes. The live zoom control scales these for
// display — see `useGalleryZoom()` below — without changing what's fetched.
const TILE_ROW_HEIGHT = 260;
const HORIZONTAL_HEIGHT = 260;

// Requested thumbnail width per layout (~2x the on-screen display size for
// retina). Fixed per layout — not per item, and not per zoom level — so
// Supabase caches one predictable transform variant per layout regardless of
// how far the user zooms in or out; zooming is a pure CSS resize of whatever
// is already loaded. It's generated large enough to cover
// THUMB_GENERATION_STEP steps of zoom without upscaling; beyond that it
// upscales slightly, which is the intentional tradeoff for not fetching a new
// image per zoom level. Full resolution is served only in the lightbox.
// Effective only when NEXT_PUBLIC_IMAGE_TRANSFORM=on; otherwise mediaThumbUrl
// falls back to the original.
const BASE_THUMB_WIDTH: Record<GalleryData["layout"], number> = {
  tile: 700, // rows ~260px tall, width varies with aspect
  vertical: 1400, // full content-column width
  horizontal: 600, // ~260px-tall row in a horizontal scroller
};
const THUMB_WIDTH: Record<GalleryData["layout"], number> = Object.fromEntries(
  (Object.entries(BASE_THUMB_WIDTH) as [GalleryData["layout"], number][]).map(([layout, width]) => [
    layout,
    Math.round(width * zoomScale(THUMB_GENERATION_STEP)),
  ])
) as Record<GalleryData["layout"], number>;

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
  const { step: zoomStep } = useGalleryZoom();
  const scale = zoomScale(zoomStep);

  // useLayoutEffect: measure before paint so the justified layout doesn't
  // flash at the SSR-assumed 960px width and then visibly reflow.
  useLayoutEffect(() => {
    if (layout !== "tile" || !containerRef.current) return;
    const el = containerRef.current;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout]);

  const justified = useMemo(
    () => (layout === "tile" ? computeJustified(items, containerWidth, TILE_ROW_HEIGHT * scale) : null),
    [layout, items, containerWidth, scale]
  );

  // A vertical gallery is already a single full-width column, so zooming past
  // 100% has nothing to grow into — only zooming out (narrowing, centered)
  // has a visible effect.
  const verticalWidthPct = Math.min(100, 100 * scale);

  return (
    <>
      <div
        ref={containerRef}
        className={`public-gallery public-gallery-${layout}`}
        style={
          layout === "tile"
            ? { position: "relative", height: justified?.totalHeight ?? 0 }
            : layout === "vertical"
              ? { width: `${verticalWidthPct}%`, margin: "0 auto" }
              : undefined
        }
      >
        {layout === "tile"
          ? justified?.positions.map(({ item, left, top, width, height }, i) => (
              <GalleryItem
                key={item.id}
                item={item}
                caption={captions[item.id]}
                thumbWidth={THUMB_WIDTH[layout]}
                style={{ position: "absolute", left, top, width, height }}
                onClick={() => setLightboxIndex(i)}
              />
            ))
          : items.map((item, i) => (
              <GalleryItem
                key={item.id}
                item={item}
                caption={captions[item.id]}
                thumbWidth={THUMB_WIDTH[layout]}
                style={layout === "horizontal" ? { height: HORIZONTAL_HEIGHT * scale, flex: "none" } : { width: "100%" }}
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
  thumbWidth,
  onClick,
}: {
  item: Media;
  caption?: string;
  style: React.CSSProperties;
  thumbWidth: number;
  onClick: () => void;
}) {
  return (
    <button type="button" className="public-gallery-item" style={style} onClick={onClick}>
      {item.type === "video" ? (
        <>
          <video src={mediaPublicUrl(item.storage_path)} muted playsInline preload="metadata" />
          <span className="public-gallery-play" aria-hidden="true" />
        </>
      ) : (
        <Image
          src={mediaThumbUrl(item.storage_path, thumbWidth)}
          alt={caption ?? ""}
          width={item.width ?? thumbWidth}
          height={item.height ?? Math.round(thumbWidth * 0.75)}
          sizes="(max-width: 700px) 50vw, 320px"
          loading="lazy"
        />
      )}
      {caption && <span className="public-gallery-caption">{caption}</span>}
    </button>
  );
}
