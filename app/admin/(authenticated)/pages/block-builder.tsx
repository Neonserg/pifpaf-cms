"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { mediaPublicUrl } from "@/lib/media-url";
import type { Json, Tables } from "@/lib/supabase/database.types";
import {
  createBlock,
  deleteBlock,
  duplicateBlock,
  reorderBlocks,
  updateBlockData,
  type BlockType,
} from "./block-actions";
import { recordUploadedMedia } from "../media/actions";

type Block = Tables<"blocks">;
type Media = Tables<"media">;

type TextData = { html: string };
type ColumnsData = { cols: 2 | 3; values: string[] };
type GalleryData = { layout: "tile" | "vertical" | "horizontal"; media: string[]; captions: Record<string, string> };
type MediaBlockData = { mediaId: string | null; width: "original" | "100" | "50" | "33"; align: "left" | "center" | "right" };

const BLOCK_LABEL: Record<BlockType, string> = {
  text: "Текстовий блок",
  columns: "Багатоколонковий текст",
  gallery: "Галерея",
  media: "Окреме медіа",
};

function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("video")) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      v.onloadedmetadata = () => {
        resolve({ width: v.videoWidth || 16, height: v.videoHeight || 9 });
        URL.revokeObjectURL(url);
      };
      v.onerror = () => resolve({ width: 16, height: 9 });
      v.src = url;
    } else {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth || 4, height: img.naturalHeight || 3 });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => resolve({ width: 4, height: 3 });
      img.src = url;
    }
  });
}

async function uploadFiles(files: File[], onCreated: (row: Media) => void): Promise<Media[]> {
  const supabase = createBrowserSupabaseClient();
  const created: Media[] = [];
  for (const file of files) {
    const dims = await readDimensions(file);
    const type: "photo" | "video" = file.type.startsWith("video") ? "video" : "photo";
    const path = `${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("media").upload(path, file);
    if (error) {
      alert(`Не вдалося завантажити ${file.name}: ${error.message}`);
      continue;
    }
    const row = (await recordUploadedMedia({
      filename: file.name,
      type,
      storage_path: path,
      width: dims.width,
      height: dims.height,
    })) as Media;
    created.push(row);
    onCreated(row);
  }
  return created;
}

/** Justified-rows layout (rows aligned by height, no cropping) — same algorithm as the prototype. */
function computeJustified(items: Media[], containerWidth: number, rowHeight: number, gap = 4) {
  const positioned: { item: Media; left: number; top: number; width: number; height: number }[] = [];
  let row: Media[] = [];
  let rowWidth = 0;
  let top = 0;

  function flush(isLast: boolean) {
    if (!row.length || containerWidth <= 0) {
      row = [];
      rowWidth = 0;
      return;
    }
    const targetW = containerWidth - gap * (row.length - 1);
    const scale = isLast ? Math.min(1.15, targetW / rowWidth) : targetW / rowWidth;
    const h = rowHeight * scale;
    let left = 0;
    for (const it of row) {
      const w = ((it.width ?? 4) / (it.height ?? 3)) * h;
      positioned.push({ item: it, left, top, width: w, height: h });
      left += w + gap;
    }
    top += h + gap;
    row = [];
    rowWidth = 0;
  }

  for (const it of items) {
    const w = ((it.width ?? 4) / (it.height ?? 3)) * rowHeight;
    row.push(it);
    rowWidth += w + (row.length > 1 ? gap : 0);
    if (rowWidth >= containerWidth) flush(false);
  }
  flush(true);

  return { positions: positioned, totalHeight: top };
}

export default function BlockBuilder({
  pageId,
  initialBlocks,
  media,
  onMediaCreated,
  onChanged,
}: {
  pageId: string;
  initialBlocks: Block[];
  media: Media[];
  onMediaCreated: (row: Media) => void;
  onChanged: () => void;
}) {
  const [prevInitialBlocks, setPrevInitialBlocks] = useState(initialBlocks);
  const [blocks, setBlocks] = useState(() => initialBlocks.slice().sort((a, b) => a.sort_order - b.sort_order));
  const [openInserter, setOpenInserter] = useState<string | null>(null); // "" for the top inserter
  const [dragBlockId, setDragBlockId] = useState<string | null>(null);

  // Resync from fresh server data (after router.refresh()) without an effect —
  // adjusting state during render, per React's guidance for this exact case.
  if (initialBlocks !== prevInitialBlocks) {
    setPrevInitialBlocks(initialBlocks);
    setBlocks(initialBlocks.slice().sort((a, b) => a.sort_order - b.sort_order));
  }

  async function handleInsert(afterId: string | null, type: BlockType) {
    setOpenInserter(null);
    const created = await createBlock(pageId, type, afterId);
    setBlocks((prev) => {
      const next = prev.slice();
      const idx = afterId ? next.findIndex((b) => b.id === afterId) + 1 : 0;
      next.splice(idx, 0, created as Block);
      return next;
    });
    onChanged();
  }

  async function handleDelete(blockId: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    await deleteBlock(pageId, blockId);
    onChanged();
  }

  async function handleDuplicate(blockId: string) {
    await duplicateBlock(pageId, blockId);
    onChanged();
  }

  function patchLocal(blockId: string, data: Json) {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, data } : b)));
  }

  async function handleBlockDrop(targetId: string) {
    if (!dragBlockId || dragBlockId === targetId) return;
    const list = blocks.slice();
    const from = list.findIndex((b) => b.id === dragBlockId);
    const to = list.findIndex((b) => b.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setBlocks(list);
    setDragBlockId(null);
    await reorderBlocks(pageId, list.map((b) => b.id));
    onChanged();
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <Inserter
        open={openInserter === ""}
        onToggle={() => setOpenInserter((cur) => (cur === "" ? null : ""))}
        onPick={(t) => handleInsert(null, t)}
      />
      {blocks.map((block) => (
        <div key={block.id}>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleBlockDrop(block.id)}
            style={{
              position: "relative",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              background: "var(--surface)",
              marginBottom: 2,
              opacity: dragBlockId === block.id ? 0.35 : 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                borderBottom: "1px solid var(--line)",
                background: "var(--surface-2)",
                borderRadius: "var(--radius) var(--radius) 0 0",
              }}
            >
              <span
                draggable
                onDragStart={() => setDragBlockId(block.id)}
                onDragEnd={() => setDragBlockId(null)}
                title="Перетягнути блок"
                style={{ cursor: "grab", color: "var(--muted)", display: "flex" }}
              >
                <GripIcon />
              </span>
              <span style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
                {BLOCK_LABEL[block.type as BlockType]}
              </span>
              <span style={{ flex: 1 }} />
              <button
                type="button"
                title="Дублювати"
                onClick={() => handleDuplicate(block.id)}
                style={iconBtnStyle}
              >
                <DupIcon />
              </button>
              <button type="button" title="Видалити" onClick={() => handleDelete(block.id)} style={iconBtnStyle}>
                <TrashIcon />
              </button>
            </div>
            <div style={{ padding: 16 }}>
              {block.type === "text" && (
                <TextBlockEditor
                  data={block.data as unknown as TextData}
                  onChange={(d) => {
                    patchLocal(block.id, d as unknown as Json);
                    updateBlockData(block.id, d as unknown as Json);
                  }}
                />
              )}
              {block.type === "columns" && (
                <ColumnsBlockEditor
                  data={block.data as unknown as ColumnsData}
                  onChange={(d) => {
                    patchLocal(block.id, d as unknown as Json);
                    updateBlockData(block.id, d as unknown as Json);
                  }}
                />
              )}
              {block.type === "gallery" && (
                <GalleryBlockEditor
                  data={block.data as unknown as GalleryData}
                  media={media}
                  onMediaCreated={onMediaCreated}
                  onChange={(d) => {
                    patchLocal(block.id, d as unknown as Json);
                    updateBlockData(block.id, d as unknown as Json);
                  }}
                />
              )}
              {block.type === "media" && (
                <MediaBlockEditor
                  data={block.data as unknown as MediaBlockData}
                  media={media}
                  onMediaCreated={onMediaCreated}
                  onChange={(d) => {
                    patchLocal(block.id, d as unknown as Json);
                    updateBlockData(block.id, d as unknown as Json);
                  }}
                />
              )}
            </div>
          </div>
          <Inserter
            open={openInserter === block.id}
            onToggle={() => setOpenInserter((cur) => (cur === block.id ? null : block.id))}
            onPick={(t) => handleInsert(block.id, t)}
          />
        </div>
      ))}
    </div>
  );
}

function Inserter({
  open,
  onToggle,
  onPick,
}: {
  open: boolean;
  onToggle: () => void;
  onPick: (type: BlockType) => void;
}) {
  return (
    <div style={{ position: "relative", minHeight: 22, margin: "6px 0", display: "flex", alignItems: "center" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: "var(--line)" }} />
      <button
        type="button"
        onClick={onToggle}
        style={{
          position: "relative",
          zIndex: 1,
          margin: "0 auto",
          height: 25,
          padding: "0 12px",
          borderRadius: 13,
          border: "1px dashed var(--line)",
          background: "var(--paper)",
          color: open ? "var(--accent-ink)" : "var(--muted)",
          cursor: "pointer",
          fontSize: 12,
          opacity: open ? 1 : 0.6,
          borderColor: open ? "var(--accent)" : "var(--line)",
          backgroundColor: open ? "var(--accent)" : "var(--paper)",
        }}
      >
        + Додати блок
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            top: 30,
            zIndex: 20,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow)",
            padding: 6,
            width: 220,
          }}
        >
          {(["text", "columns", "gallery", "media"] as BlockType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onPick(t)}
              style={{
                width: "100%",
                display: "block",
                padding: "8px 9px",
                border: 0,
                background: "transparent",
                borderRadius: 3,
                cursor: "pointer",
                textAlign: "left",
                color: "var(--ink)",
                fontSize: 13,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {BLOCK_LABEL[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- text block ---------------- */

function RichTextToolbar() {
  function exec(cmd: string) {
    if (cmd === "createLink") {
      const url = window.prompt("URL посилання:", "https://");
      if (url) document.execCommand("createLink", false, url);
    } else {
      document.execCommand(cmd, false);
    }
  }
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
      {[
        { cmd: "bold", label: <b>B</b> },
        { cmd: "italic", label: <i>I</i> },
        { cmd: "createLink", label: "🔗" },
        { cmd: "insertUnorderedList", label: "≡" },
      ].map(({ cmd, label }) => (
        <button
          key={cmd}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec(cmd);
          }}
          style={{ width: 26, height: 26, border: "1px solid var(--line)", background: "var(--surface)", borderRadius: 3, cursor: "pointer", color: "var(--ink)", fontSize: 12 }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function TextBlockEditor({ data, onChange }: { data: TextData; onChange: (d: TextData) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div>
      <RichTextToolbar />
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={() => onChange({ html: ref.current?.innerHTML ?? "" })}
        dangerouslySetInnerHTML={{ __html: data.html || "" }}
        style={{ minHeight: 52, outline: "none", fontSize: 14, lineHeight: 1.6 }}
        data-placeholder="Введіть текст…"
      />
    </div>
  );
}

/* ---------------- columns block ---------------- */

function ColumnsBlockEditor({ data, onChange }: { data: ColumnsData; onChange: (d: ColumnsData) => void }) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const cols = data.cols ?? 2;
  const values = data.values ?? ["", ""];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {[2, 3].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              const nv = values.slice();
              while (nv.length < n) nv.push("");
              onChange({ cols: n as 2 | 3, values: nv });
            }}
            style={segBtnStyle(cols === n)}
          >
            {n} колонки
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <RichTextToolbar />
            <div
              ref={(el) => {
                refs.current[i] = el;
              }}
              contentEditable
              suppressContentEditableWarning
              onBlur={() => {
                const nv = values.slice();
                nv[i] = refs.current[i]?.innerHTML ?? "";
                onChange({ cols, values: nv });
              }}
              dangerouslySetInnerHTML={{ __html: values[i] || "" }}
              data-placeholder={`Текст колонки ${i + 1}…`}
              style={{ border: "1px dashed var(--line)", borderRadius: 3, padding: 10, minHeight: 60, fontSize: 13.5, outline: "none", flex: 1 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- gallery block ---------------- */

function GalleryBlockEditor({
  data,
  media,
  onMediaCreated,
  onChange,
}: {
  data: GalleryData;
  media: Media[];
  onMediaCreated: (row: Media) => void;
  onChange: (d: GalleryData) => void;
}) {
  const layout = data.layout ?? "tile";
  const mediaIds = useMemo(() => data.media ?? [], [data.media]);
  const captions = data.captions ?? {};
  const [pickerOpen, setPickerOpen] = useState(false);
  const [captionTarget, setCaptionTarget] = useState<string | null>(null);
  const [dragMediaId, setDragMediaId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(660);

  const items = useMemo(
    () => mediaIds.map((id) => media.find((m) => m.id === id)).filter((m): m is Media => !!m),
    [mediaIds, media]
  );

  useEffect(() => {
    if (layout !== "tile" || !containerRef.current) return;
    const el = containerRef.current;
    const measure = () => setContainerWidth(el.clientWidth || 660);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout]);

  const justified = useMemo(
    () => (layout === "tile" ? computeJustified(items, containerWidth, 92) : null),
    [layout, items, containerWidth]
  );

  function removeMedia(id: string) {
    onChange({ layout, media: mediaIds.filter((m) => m !== id), captions });
  }

  function reorderMedia(fromId: string, toId: string) {
    const next = mediaIds.slice();
    const from = next.indexOf(fromId);
    const to = next.indexOf(toId);
    if (from < 0 || to < 0 || from === to) return;
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange({ layout, media: next, captions });
  }

  function handleConfirmMedia(ids: string[], order: "start" | "end") {
    const next = order === "start" ? [...ids, ...mediaIds] : [...mediaIds, ...ids];
    onChange({ layout, media: next, captions });
    setPickerOpen(false);
  }

  const captionItem = captionTarget ? media.find((m) => m.id === captionTarget) : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(
            [
              ["tile", "Плитка"],
              ["vertical", "Вертикальний скрол"],
              ["horizontal", "Горизонтальний скрол"],
            ] as const
          ).map(([val, label]) => (
            <button key={val} type="button" onClick={() => onChange({ layout: val, media: mediaIds, captions })} style={segBtnStyle(layout === val)}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="btn subtle" onClick={() => setPickerOpen(true)}>
          + Додати медіа
        </button>
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{items.length} елемент(ів)</div>

      <div style={{ border: "1px solid var(--line)", borderRadius: 3, background: "var(--surface-2)", padding: 6, minHeight: 80 }}>
        {items.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80, color: "var(--muted)", fontSize: 13 }}>
            Галерея порожня — додайте медіа
          </div>
        ) : layout === "tile" ? (
          <div ref={containerRef} style={{ position: "relative", height: justified?.totalHeight ?? 0 }}>
            {justified?.positions.map(({ item, left, top, width, height }) => (
              <GalleryItem
                key={item.id}
                item={item}
                caption={captions[item.id]}
                style={{ position: "absolute", left, top, width, height }}
                dragging={dragMediaId === item.id}
                dragOver={dragOverId === item.id}
                onDragStart={() => setDragMediaId(item.id)}
                onDragEnd={() => {
                  setDragMediaId(null);
                  setDragOverId(null);
                }}
                onDragOverItem={() => item.id !== dragMediaId && setDragOverId(item.id)}
                onDrop={() => dragMediaId && reorderMedia(dragMediaId, item.id)}
                onDelete={() => removeMedia(item.id)}
                onClickCaption={() => setCaptionTarget(item.id)}
              />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: layout === "vertical" ? "column" : "row", gap: 6, overflowX: layout === "horizontal" ? "auto" : "visible" }}>
            {items.map((item) => (
              <GalleryItem
                key={item.id}
                item={item}
                caption={captions[item.id]}
                style={layout === "vertical" ? { width: "100%" } : { height: 140, flex: "none" }}
                overlayCaption
                dragging={dragMediaId === item.id}
                dragOver={dragOverId === item.id}
                onDragStart={() => setDragMediaId(item.id)}
                onDragEnd={() => {
                  setDragMediaId(null);
                  setDragOverId(null);
                }}
                onDragOverItem={() => item.id !== dragMediaId && setDragOverId(item.id)}
                onDrop={() => dragMediaId && reorderMedia(dragMediaId, item.id)}
                onDelete={() => removeMedia(item.id)}
                onClickCaption={() => setCaptionTarget(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {pickerOpen && (
        <MediaPickerModal
          media={media}
          mode="multi"
          onMediaCreated={onMediaCreated}
          onClose={() => setPickerOpen(false)}
          onConfirm={handleConfirmMedia}
        />
      )}

      {captionItem && (
        <CaptionModal
          initial={captions[captionItem.id] ?? ""}
          onCancel={() => setCaptionTarget(null)}
          onSave={(text) => {
            const nextCaptions = { ...captions };
            if (text.trim()) nextCaptions[captionItem.id] = text.trim();
            else delete nextCaptions[captionItem.id];
            onChange({ layout, media: mediaIds, captions: nextCaptions });
            setCaptionTarget(null);
          }}
        />
      )}
    </div>
  );
}

function GalleryItem({
  item,
  caption,
  style,
  overlayCaption,
  dragging,
  dragOver,
  onDragStart,
  onDragEnd,
  onDragOverItem,
  onDrop,
  onDelete,
  onClickCaption,
}: {
  item: Media;
  caption?: string;
  style: React.CSSProperties;
  overlayCaption?: boolean;
  dragging: boolean;
  dragOver: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverItem: () => void;
  onDrop: () => void;
  onDelete: () => void;
  onClickCaption: () => void;
}) {
  return (
    <div
      draggable
      className="gallery-item"
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverItem();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      style={{
        ...style,
        cursor: "grab",
        opacity: dragging ? 0.35 : 1,
        outline: dragOver ? "2px solid var(--accent)" : "none",
        outlineOffset: -2,
      }}
    >
      {item.type === "video" ? (
        <video src={mediaPublicUrl(item.storage_path)} muted style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 2, display: "block", cursor: "pointer" }} onClick={onClickCaption} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaPublicUrl(item.storage_path)}
          alt={item.filename}
          onClick={onClickCaption}
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 2, display: "block", cursor: "pointer" }}
        />
      )}
      {item.type === "video" && (
        <span style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,.55)", color: "#fff", borderRadius: 3, width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <PlayIcon />
        </span>
      )}
      {caption && overlayCaption && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "14px 8px 6px", background: "linear-gradient(to top, rgba(10,10,8,.78), transparent)", color: "#fff", fontSize: 11.5, lineHeight: 1.3, pointerEvents: "none" }}>
          {caption}
        </div>
      )}
      {caption && !overlayCaption && (
        <div className="gallery-item-caption-hint" style={{ position: "absolute", left: "50%", bottom: "calc(100% + 6px)", transform: "translateX(-50%)", background: "rgba(18,18,15,.94)", color: "#fff", fontSize: 11, padding: "4px 8px", borderRadius: 4, maxWidth: 200, whiteSpace: "normal", zIndex: 8, pointerEvents: "none" }}>
          {caption}
        </div>
      )}
      <button
          type="button"
          className="gallery-item-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Прибрати з галереї"
          style={{ position: "absolute", top: 4, left: 4, width: 20, height: 20, borderRadius: "50%", border: 0, background: "rgba(15,15,12,.62)", color: "#fff", cursor: "pointer", fontSize: 11 }}
        >
          ×
        </button>
    </div>
  );
}

/* ---------------- media (single) block ---------------- */

function MediaBlockEditor({
  data,
  media,
  onMediaCreated,
  onChange,
}: {
  data: MediaBlockData;
  media: Media[];
  onMediaCreated: (row: Media) => void;
  onChange: (d: MediaBlockData) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const width = data.width ?? "original";
  const align = data.align ?? "center";
  const item = data.mediaId ? media.find((m) => m.id === data.mediaId) : null;

  const widthPct = { original: null, "100": 100, "50": 50, "33": 33.333 }[width];
  const justify = { left: "flex-start", center: "center", right: "flex-end" }[align];
  const imgStyle: React.CSSProperties = widthPct === null ? { maxWidth: "100%", width: "auto" } : { width: `${widthPct}%` };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: justify, border: "1px dashed var(--line)", borderRadius: 3, background: "var(--surface-2)", padding: 12, marginBottom: 14, minHeight: 70 }}>
        {item ? (
          item.type === "video" ? (
            <video src={mediaPublicUrl(item.storage_path)} controls style={{ ...imgStyle, height: "auto", borderRadius: 2 }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaPublicUrl(item.storage_path)} alt={item.filename} style={{ ...imgStyle, height: "auto", display: "block", borderRadius: 2 }} />
          )
        ) : (
          <div style={{ margin: "auto", color: "var(--muted)", fontSize: 12.5 }}>Медіа не обрано — вигляд зʼявиться тут</div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <label style={fieldLabelStyle}>Ширина</label>
          <div style={{ display: "flex", gap: 6 }}>
            {(
              [
                ["original", "Оригінал"],
                ["100", "100%"],
                ["50", "50%"],
                ["33", "33%"],
              ] as const
            ).map(([val, label]) => (
              <button key={val} type="button" onClick={() => onChange({ ...data, width: val })} style={segBtnStyle(width === val)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={fieldLabelStyle}>Вирівнювання</label>
          <div style={{ display: "flex", gap: 6 }}>
            {(
              [
                ["left", "Ліворуч"],
                ["center", "По центру"],
                ["right", "Праворуч"],
              ] as const
            ).map(([val, label]) => (
              <button key={val} type="button" onClick={() => onChange({ ...data, align: val })} style={segBtnStyle(align === val)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="btn subtle" style={{ alignSelf: "flex-start" }} onClick={() => setPickerOpen(true)}>
          {item ? "Замінити медіа" : "Обрати медіа"}
        </button>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          Пропорції файлу збережено автоматично{width === "original" ? " · показано в натуральну ширину" : ""}
        </div>
      </div>

      {pickerOpen && (
        <MediaPickerModal
          media={media}
          mode="single"
          onMediaCreated={onMediaCreated}
          onClose={() => setPickerOpen(false)}
          onConfirm={(ids) => {
            if (ids[0]) onChange({ ...data, mediaId: ids[0] });
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- shared: media picker modal ---------------- */

function MediaPickerModal({
  media,
  mode,
  onMediaCreated,
  onClose,
  onConfirm,
}: {
  media: Media[];
  mode: "single" | "multi";
  onMediaCreated: (row: Media) => void;
  onClose: () => void;
  onConfirm: (ids: string[], order: "start" | "end") => void;
}) {
  const [tab, setTab] = useState<"upload" | "library">("upload");
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<"start" | "end">("end");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const created = await uploadFiles(Array.from(files), onMediaCreated);
    setUploading(false);
    if (created.length) onConfirm(created.map((c) => c.id), order);
  }

  function toggle(id: string) {
    if (mode === "single") {
      setSelected([id]);
      return;
    }
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,15,12,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: 480, maxWidth: "92vw", maxHeight: "85vh", overflowY: "auto", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, boxShadow: "var(--shadow)", padding: 18 }}>
        {mode === "multi" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 12, color: "var(--muted)" }}>
            <label>Додавати нові:</label>
            <select value={order} onChange={(e) => setOrder(e.target.value as "start" | "end")} style={{ padding: "5px 8px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 3, background: "var(--surface)", color: "var(--ink)" }}>
              <option value="end">У кінець галереї</option>
              <option value="start">На початок галереї</option>
            </select>
          </div>
        )}
        <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
          <button type="button" onClick={() => setTab("upload")} style={tabBtnStyle(tab === "upload")}>
            Завантажити нові
          </button>
          <button type="button" onClick={() => setTab("library")} style={tabBtnStyle(tab === "library")}>
            Обрати з медіатеки
          </button>
        </div>

        {tab === "upload" ? (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleUpload(e.dataTransfer.files);
            }}
            style={{ border: `1.5px dashed ${dragOver ? "var(--accent)" : "var(--line)"}`, borderRadius: 3, padding: 26, textAlign: "center", color: dragOver ? "var(--accent)" : "var(--muted)", cursor: "pointer" }}
          >
            {uploading ? "Завантаження…" : (
              <>
                <b style={{ color: "inherit" }}>Перетягніть файли сюди</b> або натисніть, щоб обрати
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              multiple={mode === "multi"}
              accept="image/*,video/*"
              style={{ display: "none" }}
              onChange={(e) => handleUpload(e.target.files)}
            />
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8, maxHeight: 260, overflowY: "auto" }}>
              {media.map((m) => (
                <div
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  style={{ position: "relative", borderRadius: 3, overflow: "hidden", cursor: "pointer", border: `2px solid ${selected.includes(m.id) ? "var(--accent)" : "transparent"}`, aspectRatio: "1" }}
                >
                  {m.type === "video" ? (
                    <video src={mediaPublicUrl(m.storage_path)} muted style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaPublicUrl(m.storage_path)} alt={m.filename} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
              <button type="button" className="btn subtle" onClick={onClose}>
                Скасувати
              </button>
              <button type="button" className="btn" disabled={!selected.length} onClick={() => onConfirm(selected, order)}>
                Додати обрані
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- shared: caption modal ---------------- */

function CaptionModal({ initial, onCancel, onSave }: { initial: string; onCancel: () => void; onSave: (text: string) => void }) {
  const [text, setText] = useState(initial);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,15,12,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={{ width: 380, maxWidth: "90vw", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, boxShadow: "var(--shadow)", padding: 18 }}>
        <h4 style={{ margin: "0 0 3px", fontSize: 14.5 }}>Підпис до фото</h4>
        <p style={{ margin: "0 0 12px", fontSize: 11.5, color: "var(--muted)" }}>
          У плитці зʼявиться як підказка при наведенні; у вертикальному чи горизонтальному скролі — текстом поверх фото.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          placeholder="Короткий опис…"
          style={{ width: "100%", minHeight: 84, border: "1px solid var(--line)", borderRadius: 4, padding: "9px 10px", font: "inherit", background: "var(--paper)", color: "var(--ink)", resize: "vertical" }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button type="button" className="btn subtle" onClick={onCancel}>
            Скасувати
          </button>
          <button type="button" className="btn" onClick={() => onSave(text)}>
            Зберегти
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- small shared bits ---------------- */

function segBtnStyle(active: boolean): React.CSSProperties {
  return {
    border: "1px solid var(--line)",
    background: active ? "var(--accent)" : "var(--surface)",
    color: active ? "var(--accent-ink)" : "var(--muted)",
    borderRadius: 3,
    padding: "5px 11px",
    fontSize: 12,
    cursor: "pointer",
  };
}

function tabBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    fontSize: 12,
    border: "1px solid var(--line)",
    background: active ? "var(--ink)" : "var(--surface)",
    color: active ? "var(--paper)" : "var(--muted)",
    borderRadius: 3,
    cursor: "pointer",
  };
}

const iconBtnStyle: React.CSSProperties = {
  border: 0,
  background: "transparent",
  color: "var(--muted)",
  width: 24,
  height: 24,
  borderRadius: 3,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--muted)",
  marginBottom: 6,
};

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="8" cy="6" r="1.4" />
      <circle cx="8" cy="12" r="1.4" />
      <circle cx="8" cy="18" r="1.4" />
      <circle cx="16" cy="6" r="1.4" />
      <circle cx="16" cy="12" r="1.4" />
      <circle cx="16" cy="18" r="1.4" />
    </svg>
  );
}
function DupIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="8" y="8" width="12" height="12" rx="1.5" />
      <path d="M5 15V5a1 1 0 011-1h10" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 017 19V7" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
