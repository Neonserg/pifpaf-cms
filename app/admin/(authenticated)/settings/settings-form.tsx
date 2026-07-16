"use client";

import { useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { mediaPublicUrl } from "@/lib/media-url";
import type { Tables } from "@/lib/supabase/database.types";
import { updateSettings } from "./actions";

type Settings = Tables<"settings">;

export default function SettingsForm({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<"favicon_url" | "og_image_url" | null>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const ogInputRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateSettings({
        site_title: settings.site_title,
        site_description: settings.site_description,
        copyright_text: settings.copyright_text,
        favicon_url: settings.favicon_url,
        og_image_url: settings.og_image_url,
        sidebar_collapsed_default: settings.sidebar_collapsed_default,
        cookie_notice_enabled: settings.cookie_notice_enabled,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося зберегти");
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(field: "favicon_url" | "og_image_url", file: File) {
    setUploadingField(field);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const path = `${crypto.randomUUID()}-${file.name}`;
      const { error: storageError } = await supabase.storage.from("media").upload(path, file);
      if (storageError) throw new Error(storageError.message);
      set(field, mediaPublicUrl(path));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося завантажити файл");
    } finally {
      setUploadingField(null);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 560 }}>
      <h1 style={{ fontSize: 20, margin: "0 0 24px" }}>Налаштування сайту</h1>

      {error && (
        <p
          style={{
            background: "var(--rec-soft)",
            color: "var(--rec)",
            fontSize: 13,
            padding: "8px 10px",
            borderRadius: "var(--radius)",
            marginBottom: 16,
          }}
        >
          {error}
        </p>
      )}

      <Section title="Загальне">
        <Field label="Назва сайту">
          <input
            style={inputStyle}
            value={settings.site_title ?? ""}
            onChange={(e) => set("site_title", e.target.value)}
          />
        </Field>
        <Field label="Опис сайту">
          <textarea
            style={{ ...inputStyle, minHeight: 64, resize: "vertical" }}
            value={settings.site_description ?? ""}
            onChange={(e) => set("site_description", e.target.value)}
          />
        </Field>
        <Field label="Текст копірайту">
          <input
            style={inputStyle}
            value={settings.copyright_text ?? ""}
            onChange={(e) => set("copyright_text", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Зображення">
        <Field label="Favicon">
          <ImagePicker
            url={settings.favicon_url}
            uploading={uploadingField === "favicon_url"}
            inputRef={faviconInputRef}
            onPick={(file) => handleImageUpload("favicon_url", file)}
            onClear={() => set("favicon_url", null)}
          />
        </Field>
        <Field label="OG-зображення (превʼю для соцмереж)">
          <ImagePicker
            url={settings.og_image_url}
            uploading={uploadingField === "og_image_url"}
            inputRef={ogInputRef}
            onPick={(file) => handleImageUpload("og_image_url", file)}
            onClear={() => set("og_image_url", null)}
          />
        </Field>
      </Section>

      <Section title="Поведінка">
        <label style={checkboxRow}>
          <input
            type="checkbox"
            checked={settings.sidebar_collapsed_default}
            onChange={(e) => set("sidebar_collapsed_default", e.target.checked)}
          />
          Бічне меню згорнуте за замовчуванням
        </label>
        <label style={checkboxRow}>
          <input
            type="checkbox"
            checked={settings.cookie_notice_enabled}
            onChange={(e) => set("cookie_notice_enabled", e.target.checked)}
          />
          Показувати повідомлення про cookies
        </label>
      </Section>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24 }}>
        <button className="btn" onClick={handleSave} disabled={saving} type="button">
          {saving ? "Збереження…" : "Зберегти"}
        </button>
        {saved && <span style={{ color: "var(--muted)", fontSize: 13 }}>Збережено</span>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--muted)",
          margin: "0 0 12px",
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function ImagePicker({
  url,
  uploading,
  inputRef,
  onPick,
  onClear,
}: {
  url: string | null;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          style={{ width: 40, height: 40, objectFit: "cover", borderRadius: "var(--radius)", border: "1px solid var(--line)" }}
        />
      ) : (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--radius)",
            border: "1px dashed var(--line)",
            background: "var(--surface-2)",
          }}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
      <button
        className="btn subtle"
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Завантаження…" : url ? "Замінити" : "Завантажити"}
      </button>
      {url && (
        <button className="btn subtle" type="button" onClick={onClear}>
          Прибрати
        </button>
      )}
    </div>
  );
}

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--muted)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  background: "var(--paper)",
  color: "var(--ink)",
  font: "inherit",
};

const checkboxRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
  marginBottom: 10,
};
