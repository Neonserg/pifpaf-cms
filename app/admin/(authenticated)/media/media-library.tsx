"use client";

import { useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { deleteMedia, recordUploadedMedia } from "./actions";

type Media = Tables<"media">;

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

export default function MediaLibrary({ initialMedia }: { initialMedia: Media[] }) {
  const [items, setItems] = useState(initialMedia);
  const [uploading, setUploading] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "photo" | "video">("all");
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () =>
      items.filter((m) => {
        if (typeFilter !== "all" && m.type !== typeFilter) return false;
        if (search && !m.filename.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [items, search, typeFilter]
  );

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || !fileList.length) return;
    const files = Array.from(fileList);
    setUploading((u) => [...u, ...files.map((f) => f.name)]);

    const supabase = createBrowserSupabaseClient();

    for (const file of files) {
      const dims = await readDimensions(file);
      const type: "photo" | "video" = file.type.startsWith("video") ? "video" : "photo";
      const path = `${crypto.randomUUID()}-${file.name}`;

      const { error: storageError } = await supabase.storage.from("media").upload(path, file);
      if (storageError) {
        setUploading((u) => u.filter((n) => n !== file.name));
        setUploadError(`Не вдалося завантажити ${file.name}: ${storageError.message}`);
        continue;
      }

      const row = await recordUploadedMedia({
        filename: file.name,
        type,
        storage_path: path,
        width: dims.width,
        height: dims.height,
      });

      setItems((prev) => [row as Media, ...prev]);
      setUploading((u) => u.filter((n) => n !== file.name));
    }
  }

  function publicUrl(path: string) {
    const supabase = createBrowserSupabaseClient();
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  async function handleDelete(item: Media) {
    setItems((prev) => prev.filter((m) => m.id !== item.id));
    setConfirmDeleteId(null);
    await deleteMedia(item.id, item.storage_path);
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 20px",
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Пошук за назвою…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: 260 }}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} style={inputStyle}>
          <option value="all">Усі типи</option>
          <option value="photo">Тільки фото</option>
          <option value="video">Тільки відео</option>
        </select>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>{filtered.length} файлів</span>
      </div>

      <div style={{ padding: "18px 20px 60px" }}>
        {uploadError && (
          <p
            style={{
              background: "var(--rec-soft)",
              color: "var(--rec)",
              fontSize: 13,
              padding: "8px 10px",
              borderRadius: "var(--radius)",
              marginBottom: 14,
            }}
          >
            {uploadError}{" "}
            <button
              type="button"
              onClick={() => setUploadError(null)}
              style={{ border: 0, background: "transparent", color: "inherit", textDecoration: "underline", cursor: "pointer" }}
            >
              приховати
            </button>
          </p>
        )}
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
            handleFiles(e.dataTransfer.files);
          }}
          style={{
            border: `1.5px dashed ${dragOver ? "var(--accent)" : "var(--line)"}`,
            borderRadius: 6,
            padding: 22,
            textAlign: "center",
            color: dragOver ? "var(--accent)" : "var(--muted)",
            background: dragOver ? "var(--accent-soft)" : "transparent",
            marginBottom: 18,
            cursor: "pointer",
          }}
        >
          <b style={{ color: "inherit" }}>Перетягніть сюди фото чи відео</b> — або натисніть, щоб обрати. Можна одразу декілька файлів.
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            style={{ display: "none" }}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 12,
          }}
        >
          {uploading.map((name) => (
            <div
              key={name}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 4,
                aspectRatio: "4/3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: "var(--muted)",
                background: "var(--surface-2)",
                padding: 8,
                textAlign: "center",
              }}
            >
              Завантаження… {name}
            </div>
          ))}

          {filtered.map((m) => (
            <div key={m.id} className="media-card">
              <div
                style={{
                  position: "relative",
                  aspectRatio: "4/3",
                  background: "var(--surface-2)",
                  overflow: "hidden",
                  borderRadius: "4px 4px 0 0",
                }}
              >
                {m.type === "video" ? (
                  <video src={publicUrl(m.storage_path)} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={publicUrl(m.storage_path)}
                    alt={m.filename}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                )}
                {confirmDeleteId === m.id ? (
                  <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
                    <button
                      onClick={() => handleDelete(m)}
                      title="Так, видалити"
                      style={{ ...deleteBtnStyle, background: "var(--rec)" }}
                    >
                      ✓
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} title="Скасувати" style={deleteBtnStyle}>
                      ×
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDeleteId(m.id)} title="Видалити" style={{ position: "absolute", top: 4, right: 4, ...deleteBtnStyle }}>
                    ×
                  </button>
                )}
              </div>
              <div
                style={{
                  padding: "7px 9px",
                  border: "1px solid var(--line)",
                  borderTop: 0,
                  borderRadius: "0 0 4px 4px",
                  background: "var(--surface)",
                }}
              >
                <div style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.filename}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                  {m.width}×{m.height}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const deleteBtnStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: "50%",
  border: 0,
  background: "rgba(15,15,12,.65)",
  color: "#fff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
};

const inputStyle: React.CSSProperties = {
  padding: "7px 10px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  background: "var(--paper)",
  color: "var(--ink)",
  font: "inherit",
  fontSize: 13,
};
