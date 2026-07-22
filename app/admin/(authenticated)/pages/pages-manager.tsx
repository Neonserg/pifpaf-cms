"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PageRow, BlockRow, MediaRow } from "@/lib/db/schema";
import { createPage, deletePage, reorderPages, setHomePage, updatePage } from "./actions";
import BlockBuilder from "./block-builder";

type Page = PageRow;
type Block = BlockRow;
type Media = MediaRow;
// The generated DB type widens the `type` column's check constraint to
// `string`; re-declare the literal union ourselves for real exhaustiveness.
type PageType = "category" | "content" | "link" | "spacer";

const TYPE_LABEL: Record<PageType, string> = {
  category: "Категорія",
  content: "Сторінка",
  link: "Посилання",
  spacer: "Роздільник",
};

export default function PagesManager({
  initialPages,
  initialBlocks,
  initialMedia,
}: {
  initialPages: Page[];
  initialBlocks: Block[];
  initialMedia: Media[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(
    initialPages.find((p) => p.parent_id === null)?.id ?? null
  );
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [prevInitialMedia, setPrevInitialMedia] = useState(initialMedia);
  const [media, setMedia] = useState(initialMedia);

  // Resync from fresh server data (after router.refresh()) without an effect —
  // adjusting state during render, per React's guidance for this exact case.
  if (initialMedia !== prevInitialMedia) {
    setPrevInitialMedia(initialMedia);
    setMedia(initialMedia);
  }

  const byParent = useMemo(() => {
    const map = new Map<string | "root", Page[]>();
    for (const p of initialPages) {
      const key = p.parent_id ?? "root";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    for (const list of map.values()) list.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [initialPages]);

  const selected = initialPages.find((p) => p.id === selectedId) ?? null;
  const roots = byParent.get("root") ?? [];

  function refresh() {
    startTransition(() => router.refresh());
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const target = initialPages.find((p) => p.id === targetId);
    const dragged = initialPages.find((p) => p.id === dragId);
    if (!target || !dragged || target.parent_id !== dragged.parent_id) {
      setDragId(null);
      return;
    }
    const siblings = (byParent.get(target.parent_id ?? "root") ?? []).slice();
    const from = siblings.findIndex((p) => p.id === dragId);
    const to = siblings.findIndex((p) => p.id === targetId);
    const [moved] = siblings.splice(from, 1);
    siblings.splice(to, 0, moved);
    const updates = siblings.map((p, i) => ({ id: p.id, sort_order: i }));
    setDragId(null);
    startTransition(async () => {
      await reorderPages(updates);
      router.refresh();
    });
  }

  function renderNode(page: Page, depth: number): React.ReactNode {
    const isCategory = page.type === "category";
    const open = !!openCats[page.id];
    const children = byParent.get(page.id) ?? [];

    return (
      <li key={page.id} style={{ marginBottom: 1 }}>
        <div
          draggable
          onDragStart={() => setDragId(page.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(page.id)}
          onClick={() => {
            setSelectedId(page.id);
            if (isCategory) setOpenCats((s) => ({ ...s, [page.id]: !s[page.id] }));
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 8px",
            paddingLeft: 8 + depth * 16,
            borderRadius: "var(--radius)",
            cursor: "grab",
            background: selectedId === page.id ? "var(--accent-soft)" : "transparent",
            fontWeight: selectedId === page.id ? 600 : 400,
            opacity: page.is_hidden ? 0.55 : 1,
          }}
        >
          {isCategory && <span style={{ fontSize: 10, color: "var(--muted)" }}>{open ? "▾" : "▸"}</span>}
          <span style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {page.title}
            {page.is_home && " · home"}
          </span>
          {isCategory && <span style={{ fontSize: 11, color: "var(--muted)" }}>{children.length}</span>}
        </div>
        {isCategory && open && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {children.map((c) => renderNode(c, depth + 1))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <aside
        style={{
          width: 280,
          flex: "none",
          borderRight: "1px solid var(--line)",
          overflowY: "auto",
          padding: "12px 8px",
        }}
      >
        <div
          style={{
            padding: "6px 10px 12px",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--muted)",
          }}
        >
          Меню сайту
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{roots.map((p) => renderNode(p, 0))}</ul>
        <div style={{ marginTop: 10 }}>
          <button className="btn subtle" style={{ width: "100%", justifyContent: "center" }} onClick={() => setShowAddForm((s) => !s)}>
            + Додати пункт меню
          </button>
        </div>
        {showAddForm && (
          <AddPageForm
            categories={initialPages.filter((p) => p.type === "category")}
            onCreated={() => {
              setShowAddForm(false);
              refresh();
            }}
          />
        )}
      </aside>

      <div style={{ flex: 1, overflowY: "auto", background: "var(--paper)" }}>
        {selected ? (
          <PageDetail
            key={selected.id}
            page={selected}
            blocks={initialBlocks.filter((b) => b.page_id === selected.id)}
            media={media}
            onMediaCreated={(row) => setMedia((m) => [row, ...m])}
            onChanged={refresh}
          />
        ) : (
          <div style={{ padding: 24, color: "var(--muted)" }}>Оберіть пункт меню зліва</div>
        )}
      </div>
    </div>
  );
}

function AddPageForm({
  categories,
  onCreated,
}: {
  categories: Page[];
  onCreated: () => void;
}) {
  const [type, setType] = useState<PageType>("content");
  const [title, setTitle] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [pending, setPending] = useState(false);

  return (
    <form
      style={{
        marginTop: 10,
        padding: 10,
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        background: "var(--surface)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setPending(true);
        await createPage({ type, title: title.trim(), parent_id: parentId || null });
        setPending(false);
        onCreated();
      }}
    >
      <select value={type} onChange={(e) => setType(e.target.value as PageType)} style={selectStyle}>
        <option value="content">Сторінка</option>
        <option value="category">Категорія</option>
        <option value="link">Посилання</option>
        <option value="spacer">Роздільник</option>
      </select>
      {categories.length > 0 && (
        <select value={parentId} onChange={(e) => setParentId(e.target.value)} style={selectStyle}>
          <option value="">— без категорії —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              у категорії: {c.title}
            </option>
          ))}
        </select>
      )}
      <input
        placeholder="Назва"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={selectStyle}
        autoFocus
      />
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Додаємо…" : "Додати"}
      </button>
    </form>
  );
}

function PageDetail({
  page,
  blocks,
  media,
  onMediaCreated,
  onChanged,
}: {
  page: Page;
  blocks: Block[];
  media: Media[];
  onMediaCreated: (row: Media) => void;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug ?? "");
  const [externalUrl, setExternalUrl] = useState(page.external_url ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function save(fields: Parameters<typeof updatePage>[1]) {
    setSaving(true);
    await updatePage(page.id, fields);
    setSaving(false);
    onChanged();
  }

  return (
    <div style={{ padding: "28px 24px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 6 }}>
        {TYPE_LABEL[page.type as PageType]}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title !== page.title && save({ title })}
        style={{ ...selectStyle, fontSize: 22, fontWeight: 700, border: 0, padding: "2px 0", marginBottom: 6 }}
      />

      {page.is_home ? (
        <p style={{ fontSize: 12, color: "var(--muted)" }}>URL: <b>/</b> — головна сторінка, адреса не редагується</p>
      ) : page.type !== "link" && page.type !== "spacer" ? (
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, display: "flex", alignItems: "center", gap: 2 }}>
          URL: pifpaf.online
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            onBlur={() => slug !== (page.slug ?? "") && save({ slug: slug || null })}
            placeholder="/nazva-storinky"
            style={{ ...selectStyle, border: 0, padding: "1px 3px", minWidth: 120 }}
          />
        </div>
      ) : null}

      {page.type === "link" && (
        <div style={{ marginBottom: 16 }}>
          <label style={fieldLabel}>Зовнішній URL</label>
          <input
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            onBlur={() => save({ external_url: externalUrl || null })}
            style={selectStyle}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
        {page.type === "content" && !page.is_home && (
          <button className="btn subtle" onClick={() => setHomePage(page.id).then(onChanged)}>
            Зробити головною
          </button>
        )}
        <button
          className="btn subtle"
          onClick={() => save({ is_hidden: !page.is_hidden })}
        >
          {page.is_hidden ? "Показати в меню" : "Приховати з меню"}
        </button>
        {confirmingDelete ? (
          <>
            <span style={{ fontSize: 12, color: "var(--rec)", alignSelf: "center" }}>
              Видалити «{page.title}»?{page.type === "category" ? " Вкладені сторінки теж будуть видалені." : ""}
            </span>
            <button className="btn" style={{ borderColor: "var(--rec)", color: "var(--rec)" }} onClick={() => deletePage(page.id).then(onChanged)}>
              Так, видалити
            </button>
            <button className="btn subtle" onClick={() => setConfirmingDelete(false)}>
              Скасувати
            </button>
          </>
        ) : (
          <button className="btn subtle" style={{ color: "var(--rec)" }} onClick={() => setConfirmingDelete(true)}>
            Видалити
          </button>
        )}
      </div>

      {saving && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>Зберігаємо…</p>}
      </div>

      {page.type === "content" && (
        <div style={{ marginTop: 24 }}>
          <BlockBuilder
            pageId={page.id}
            initialBlocks={blocks}
            media={media}
            onMediaCreated={onMediaCreated}
            onChanged={onChanged}
          />
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "7px 9px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  background: "var(--paper)",
  color: "var(--ink)",
  font: "inherit",
  fontSize: 13,
};

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--muted)",
  marginBottom: 6,
};
