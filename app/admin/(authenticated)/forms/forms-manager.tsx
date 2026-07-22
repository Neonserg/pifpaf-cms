"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FormRow, PageRow, FormSubmissionRow } from "@/lib/db/schema";
import {
  createForm,
  deleteForm,
  deleteSubmission,
  markSubmissionRead,
  updateForm,
  type FieldType,
  type FormField,
} from "./actions";

type Form = FormRow;
type Page = PageRow;
type Submission = FormSubmissionRow;

const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: "Текст",
  email: "Email",
  tel: "Телефон",
  textarea: "Багаторядковий текст",
  checkbox: "Прапорець",
};

export default function FormsManager({
  initialForms,
  initialPages,
  initialSubmissions,
}: {
  initialForms: Form[];
  initialPages: Page[];
  initialSubmissions: Submission[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(initialForms[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  function refresh() {
    startTransition(() => router.refresh());
  }

  const selected = initialForms.find((f) => f.id === selectedId) ?? null;
  const selectedSubmissions = initialSubmissions.filter((s) => s.form_id === selectedId);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    const created = await createForm(newTitle.trim());
    setNewTitle("");
    setCreating(false);
    setSelectedId(created.id);
    refresh();
  }

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <aside
        style={{
          width: 260,
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
          Форми
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {initialForms.map((f) => {
            const unread = initialSubmissions.filter((s) => s.form_id === f.id && !s.is_read).length;
            return (
              <li key={f.id}>
                <button
                  className="btn subtle"
                  style={{
                    width: "100%",
                    justifyContent: "space-between",
                    background: selectedId === f.id ? "var(--accent-soft)" : "transparent",
                    fontWeight: selectedId === f.id ? 600 : 400,
                    marginBottom: 2,
                  }}
                  onClick={() => setSelectedId(f.id)}
                >
                  <span>{f.title}</span>
                  {unread > 0 && (
                    <span style={{ fontSize: 11, color: "var(--rec)", fontWeight: 600 }}>{unread}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {creating ? (
          <div
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
          >
            <input
              placeholder="Назва форми"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={selectStyle}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <button className="btn" onClick={handleCreate} type="button">
              Створити
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <button
              className="btn subtle"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => setCreating(true)}
            >
              + Створити форму
            </button>
          </div>
        )}
      </aside>

      <div style={{ flex: 1, overflowY: "auto", background: "var(--paper)" }}>
        {selected ? (
          <FormDetail
            key={selected.id}
            form={selected}
            pages={initialPages}
            submissions={selectedSubmissions}
            onChanged={refresh}
            onDeleted={() => {
              setSelectedId(null);
              refresh();
            }}
          />
        ) : (
          <div style={{ padding: 24, color: "var(--muted)" }}>Оберіть форму зліва або створіть нову</div>
        )}
      </div>
    </div>
  );
}

function FormDetail({
  form,
  pages,
  submissions,
  onChanged,
  onDeleted,
}: {
  form: Form;
  pages: Page[];
  submissions: Submission[];
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(form.title);
  const [pageId, setPageId] = useState(form.page_id ?? "");
  const [fields, setFields] = useState<FormField[]>((form.fields as unknown as FormField[]) ?? []);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);

  async function save(next: { title?: string; page_id?: string | null; fields?: FormField[] }) {
    setSaving(true);
    await updateForm(form.id, next);
    setSaving(false);
    onChanged();
  }

  function addField() {
    const next = [...fields, { id: crypto.randomUUID(), type: "text" as FieldType, label: "", required: false }];
    setFields(next);
    save({ fields: next });
  }

  function updateField(id: string, patch: Partial<FormField>) {
    const next = fields.map((f) => (f.id === id ? { ...f, ...patch } : f));
    setFields(next);
  }

  function removeField(id: string) {
    const next = fields.filter((f) => f.id !== id);
    setFields(next);
    save({ fields: next });
  }

  return (
    <div style={{ padding: "28px 24px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== form.title && save({ title })}
          style={{ ...selectStyle, fontSize: 22, fontWeight: 700, border: 0, padding: "2px 0", marginBottom: 6 }}
        />

        <div style={{ marginBottom: 20 }}>
          <label style={fieldLabel}>Сторінка, на якій показувати форму</label>
          <select
            value={pageId}
            onChange={(e) => {
              const next = e.target.value;
              setPageId(next);
              save({ page_id: next || null });
            }}
            style={selectStyle}
          >
            <option value="">— не привʼязана —</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={fieldLabel}>Поля форми</label>
          {fields.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 8px" }}>Ще немає жодного поля.</p>
          )}
          {fields.map((field) => (
            <div
              key={field.id}
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                marginBottom: 6,
                padding: 8,
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                background: "var(--surface)",
              }}
            >
              <select
                value={field.type}
                onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                onBlur={() => save({ fields })}
                style={{ ...selectStyle, width: 150, flex: "none" }}
              >
                {(Object.keys(FIELD_TYPE_LABEL) as FieldType[]).map((t) => (
                  <option key={t} value={t}>
                    {FIELD_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
              <input
                placeholder="Підпис поля"
                value={field.label}
                onChange={(e) => updateField(field.id, { label: e.target.value })}
                onBlur={() => save({ fields })}
                style={{ ...selectStyle, flex: 1 }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted)", flex: "none" }}>
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => {
                    updateField(field.id, { required: e.target.checked });
                    save({ fields: fields.map((f) => (f.id === field.id ? { ...f, required: e.target.checked } : f)) });
                  }}
                />
                обовʼязкове
              </label>
              <button className="btn subtle" style={{ color: "var(--rec)", flex: "none" }} onClick={() => removeField(field.id)} type="button">
                ✕
              </button>
            </div>
          ))}
          <button className="btn subtle" onClick={addField} type="button">
            + Додати поле
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
          {confirmingDelete ? (
            <>
              <span style={{ fontSize: 12, color: "var(--rec)", alignSelf: "center" }}>
                Видалити форму «{form.title}»?
              </span>
              <button
                className="btn"
                style={{ borderColor: "var(--rec)", color: "var(--rec)" }}
                onClick={() => deleteForm(form.id).then(onDeleted)}
                type="button"
              >
                Так, видалити
              </button>
              <button className="btn subtle" onClick={() => setConfirmingDelete(false)} type="button">
                Скасувати
              </button>
            </>
          ) : (
            <button className="btn subtle" style={{ color: "var(--rec)" }} onClick={() => setConfirmingDelete(true)} type="button">
              Видалити форму
            </button>
          )}
        </div>

        {saving && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>Зберігаємо…</p>}

        <div style={{ marginTop: 32 }}>
          <label style={fieldLabel}>Заявки ({submissions.length})</label>
          {submissions.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0" }}>Заявок ще немає.</p>
          )}
          {submissions.map((s) => {
            const data = (s.data as Record<string, string | boolean>) ?? {};
            const expanded = expandedSubmission === s.id;
            return (
              <div
                key={s.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                  background: "var(--surface)",
                  marginBottom: 6,
                  padding: 10,
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                  onClick={() => {
                    setExpandedSubmission(expanded ? null : s.id);
                    if (!s.is_read) markSubmissionRead(s.id, true).then(onChanged);
                  }}
                >
                  <span style={{ fontWeight: s.is_read ? 400 : 600, fontSize: 13 }}>
                    {new Date(s.created_at).toLocaleString("uk-UA")}
                  </span>
                  <button
                    className="btn subtle"
                    style={{ color: "var(--rec)", fontSize: 12 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSubmission(s.id).then(onChanged);
                    }}
                    type="button"
                  >
                    Видалити
                  </button>
                </div>
                {expanded && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {fields.map((field) => (
                      <div key={field.id} style={{ fontSize: 13 }}>
                        <span style={{ color: "var(--muted)" }}>{field.label}: </span>
                        <span>{String(data[field.id] ?? "—")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
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
