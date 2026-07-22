"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaRow } from "@/lib/db/schema";
import { mediaPublicUrl } from "@/lib/media-url";

type Media = MediaRow;

export default function Lightbox({
  items,
  captions,
  startIndex,
  onClose,
}: {
  items: Media[];
  captions: Record<string, string>;
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Prefetch the adjacent full-resolution photos so arrow navigation is instant.
  useEffect(() => {
    for (const offset of [1, -1]) {
      const neighbor = items[(index + offset + items.length) % items.length];
      if (neighbor && neighbor.type !== "video") {
        const img = new Image();
        img.src = mediaPublicUrl(neighbor.storage_path);
      }
    }
  }, [index, items]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + items.length) % items.length);
      else if (e.key === "ArrowRight") setIndex((i) => (i + 1) % items.length);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [items.length, onClose]);

  const item = items[index];
  const caption = captions[item.id];

  return (
    <div className="lightbox-overlay" role="dialog" aria-modal="true" aria-label="Перегляд медіа" onClick={onClose}>
      <button ref={closeRef} type="button" className="lightbox-close" onClick={onClose} aria-label="Закрити">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      {items.length > 1 && (
        <button
          type="button"
          className="lightbox-nav lightbox-prev"
          onClick={(e) => {
            e.stopPropagation();
            setIndex((i) => (i - 1 + items.length) % items.length);
          }}
          aria-label="Попереднє"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      )}
      <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
        {item.type === "video" ? (
          <video src={mediaPublicUrl(item.storage_path)} controls autoPlay />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaPublicUrl(item.storage_path)} alt={caption ?? ""} />
        )}
        {caption && <div className="lightbox-caption">{caption}</div>}
      </div>
      {items.length > 1 && (
        <button
          type="button"
          className="lightbox-nav lightbox-next"
          onClick={(e) => {
            e.stopPropagation();
            setIndex((i) => (i + 1) % items.length);
          }}
          aria-label="Наступне"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
